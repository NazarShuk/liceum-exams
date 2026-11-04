import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, inArray } from "drizzle-orm";
import { getDrizzle } from "../db/drizzle";
import { applications, forms, profiles, users, applicantInvites } from "@db/schema";
import { env } from "cloudflare:workers";
import { logErrorEvent, logEvent } from "../lib/analytics";
import { deleteFormIfUnused } from "../lib/forms";
import { fileKeyFor, isFileKey, uploadError } from "../lib/uploads";
import { verifyTurnstile } from "../lib/turnstile";
import { APPLICATION_STATUSES } from "../lib/status";

type Schema = NonNullable<(typeof forms.$inferSelect)["schema"]>;
type Field = Schema[number];
const birthDate = z.string().min(1, "Вкажіть дату народження").pipe(z.coerce.date());

const optionalId = z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive().optional(),
);

const dayOf = (value: Date | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "");

function validateAnswer(field: Field, value: unknown): string | null {
    const required = field.required !== false;
    const label = field.title || field.slug;
    const options = field.options ?? [];

    if (field.type === "multiselect") {
        const values = (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).filter(Boolean);
        if (required && values.length === 0) return `"${label}": виберіть хоча б один варіант`;
        if (!values.every((v) => options.includes(v))) return `"${label}": некоректне значення`;
        if (field.min > 0 && values.length < field.min) return `"${label}": виберіть щонайменше ${field.min}`;
        if (field.max > 0 && values.length > field.max) return `"${label}": виберіть не більше ${field.max}`;
        return null;
    }

    const str = value == null ? "" : String(value);
    if (str.trim() === "") return required ? `"${label}": обов'язкове поле` : null;

    if (field.type === "number") {
        const num = Number(str);
        if (!Number.isFinite(num)) return `"${label}": введіть число`;
        if (field.min > 0 && num < field.min) return `"${label}": мінімум ${field.min}`;
        if (field.max > 0 && num > field.max) return `"${label}": максимум ${field.max}`;
    }

    if (field.type === "date" && Number.isNaN(Date.parse(str))) return `"${label}": некоректна дата`;

    if (field.type === "select" && !options.includes(str)) return `"${label}": некоректне значення`;

    if (field.regex) {
        try {
            if (!new RegExp("^(?:" + field.regex + ")$").test(str)) return `"${label}": невірний формат`;
        } catch {
            // malformed regex — skip validation
        }
    }

    if (field.type === "text") {
        if (field.min > 0 && str.length < field.min) return `"${label}": мінімум ${field.min} символів`;
        if (field.max > 0 && str.length > field.max) return `"${label}": максимум ${field.max} символів`;
    }

    return null;
}

async function collectAnswers(
    form: { schema: Schema },
    rawForm: FormData | null,
    input: Record<string, unknown>,
    userId: number,
    path: string,
    existingAnswers: Record<string, unknown> = {},
) {
    const formFields: Record<string, unknown> = {};
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};
    for (const field of form.schema) {
        const key = "form-" + field.slug;
        const label = field.title || field.slug;
        let value =
            field.type === "multiselect"
                ? rawForm
                    ? rawForm
                          .getAll(key)
                          .map(String)
                          .filter((v) => v !== "")
                    : (input[key] ?? [])
                : rawForm
                  ? (rawForm.get(key) ?? "")
                  : (input[key] ?? "");

        if (field.type === "file") {
            // A file uploaded on selection wins; the file input stays only as a no-JS fallback.
            const uploadedKey = rawForm ? rawForm.get("upload-" + field.slug) : input["upload-" + field.slug];
            if (typeof uploadedKey === "string" && uploadedKey !== "") value = uploadedKey;
            else if (value instanceof File && value.size === 0 && !value.name) value = "";
        }

        formFields[field.slug] = value;
        const existing = existingAnswers[field.slug];
        const existingKey =
            typeof existing === "object" && existing !== null && "key" in existing && typeof existing.key === "string"
                ? existing.key
                : undefined;
        const fileError = value instanceof File ? uploadError(value) : null;
        const error = fileError
            ? `"${label}": ${fileError}`
            : value instanceof File
              ? null
              : field.type === "file" && value !== ""
                ? isFileKey(value, userId, field.slug) || value === existingKey
                    ? null
                    : `"${label}": некоректний файл`
                : validateAnswer(field, value);
        if (error) {
            errors.push(error);
            fieldErrors[key] = error;
            logErrorEvent({
                source: "user",
                type: "form_validation_error",
                path,
                field: field.slug,
                value:
                    typeof value === "string"
                        ? value.slice(0, 200)
                        : Array.isArray(value)
                          ? value.map(String).join(",").slice(0, 200)
                          : "",
                userId,
            });
        }
    }
    return { formFields, errors, fieldErrors };
}

async function storeFiles(form: { schema: Schema }, formFields: Record<string, unknown>, userId: number) {
    for (const field of form.schema) {
        if (field.type !== "file") continue;
        const file = formFields[field.slug];
        if (file instanceof File) {
            const key = fileKeyFor(userId, field.slug);
            await env.FILE_BUCKET.put(key, await file.arrayBuffer(), {
                customMetadata: {
                    owner: userId.toString(),
                    fileName: file.name,
                    fileType: file.type,
                },
            });
            formFields[field.slug] = { key };
        } else if (typeof file === "string" && file !== "") {
            formFields[field.slug] = { key: file };
        }
    }
}

export const submitForm = defineAction({
    accept: "form",
    input: z.looseObject({
        formId: z.number(),
        profileId: z.number().int().positive(),
        draftId: optionalId,

        studentId: optionalId,
        studentfirstName: z.string().min(1, "Вкажіть ім'я учня"),
        studentlastName: z.string().min(1, "Вкажіть прізвище учня"),
        studentmiddleName: z.string().optional(),

        studentBirthDate: birthDate,
        studentTelephone: z.string().regex(/^380\d{9}$/, "Введіть номер у форматі 380XXXXXXXXX"),

        parentfirstName: z.string().min(1, "Вкажіть ім'я"),
        parentlastName: z.string().min(1, "Вкажіть прізвище"),
        parentmiddleName: z.string().optional(),

        parentBirthDate: birthDate,
        parentTelephone: z.string().regex(/^380\d{9}$/, "Введіть номер у форматі 380XXXXXXXXX"),
    }),
    handler: async (input, context) => {
        try {
            const db = getDrizzle();
            if (!context.locals.user) {
                logErrorEvent({ source: "user", type: "form_unauthorized", path: context.url?.pathname || "/" });
                throw new ActionError({ code: "UNAUTHORIZED" });
            }
            if (context.locals.user.role === "applicant") {
                logErrorEvent({
                    source: "user",
                    type: "form_forbidden_role",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                });
                throw new ActionError({ code: "FORBIDDEN", message: "Абітурієнти не можуть створювати заяви" });
            }

            let rawForm: FormData | null = null;
            try {
                rawForm = await context.request.formData();
            } catch {
                rawForm = null;
            }

            if (
                context.locals.user.role !== "admin" &&
                !(await verifyTurnstile(rawForm?.get("cf-turnstile-response"), context.request))
            ) {
                logErrorEvent({
                    source: "user",
                    type: "form_turnstile_failed",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                });
                throw new ActionError({ code: "FORBIDDEN", message: "Підтвердіть, що ви не робот" });
            }

            const form = await db.query.forms.findFirst({ where: { id: input.formId } });
            if (!form) {
                logErrorEvent({
                    source: "user",
                    type: "form_not_found",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                });
                throw new ActionError({ code: "BAD_REQUEST" });
            }

            const profile = await db.query.profiles.findFirst({ where: { id: input.profileId } });
            if (!profile || profile.formId !== form.id) {
                logErrorEvent({
                    source: "user",
                    type: "form_profile_mismatch",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `formId:${form.id},profileId:${input.profileId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST" });
            }

            const { formFields, errors, fieldErrors } = await collectAnswers(
                form,
                rawForm,
                input as Record<string, unknown>,
                context.locals.user.id,
                context.url?.pathname || "/",
            );
            if (errors.length > 0) return { success: false, message: errors.join("; "), fieldErrors };

            await db
                .update(users)
                .set({
                    firstName: input.parentfirstName,
                    lastName: input.parentlastName,
                    middleName: input.parentmiddleName || null,
                    birthDate: input.parentBirthDate,
                    phone: input.parentTelephone,
                })
                .where(eq(users.id, context.locals.user.id));

            let studentId = input.studentId;

            if (studentId == null) {
                if (
                    !input.studentfirstName ||
                    !input.studentlastName ||
                    !input.studentTelephone ||
                    !input.studentBirthDate
                ) {
                    logErrorEvent({
                        source: "user",
                        type: "form_student_missing_fields",
                        path: context.url?.pathname || "/",
                        userId: context.locals.user?.id,
                    });
                    throw new ActionError({ code: "BAD_REQUEST", message: "Заповніть інформацію про учня" });
                }

                // Reuse an existing child with the same identity instead of creating a duplicate
                const siblings = await db.query.users.findMany({ where: { parentId: context.locals.user.id } });
                const duplicate = siblings.find(
                    (sibling) =>
                        sibling.firstName.trim().toLowerCase() === input.studentfirstName.trim().toLowerCase() &&
                        sibling.lastName.trim().toLowerCase() === input.studentlastName.trim().toLowerCase() &&
                        dayOf(sibling.birthDate) === dayOf(input.studentBirthDate),
                );

                if (duplicate) {
                    studentId = duplicate.id;
                } else {
                    const created = await db
                        .insert(users)
                        .values({
                            firstName: input.studentfirstName,
                            lastName: input.studentlastName,
                            middleName: input.studentmiddleName || null,
                            phone: input.studentTelephone,
                            birthDate: new Date(input.studentBirthDate),
                            role: "applicant",
                            parentId: context.locals.user.id,
                        })
                        .returning({ id: users.id });

                    studentId = created[0].id;
                }
            } else {
                const student = await db.query.users.findFirst({ where: { id: studentId } });
                if (!student || student.role !== "applicant" || student.parentId !== context.locals.user.id) {
                    logErrorEvent({
                        source: "user",
                        type: "form_student_invalid",
                        path: context.url?.pathname || "/",
                        userId: context.locals.user?.id,
                        message: `studentId:${studentId}`,
                    });
                    throw new ActionError({ code: "BAD_REQUEST", message: "Учня не знайдено серед ваших дітей" });
                }
            }

            const campaignAssignment = await db.query.campaignsToProfiles.findFirst({
                where: { profileId: input.profileId },
            });
            if (!campaignAssignment) {
                logErrorEvent({
                    source: "user",
                    type: "form_campaign_assignment_missing",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `profileId:${input.profileId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST", message: "Профіль не належить жодній кампанії" });
            }
            const campaignId = campaignAssignment.campaignId;
            const campaign = await db.query.campaigns.findFirst({ where: { id: campaignId } });
            if (!campaign) {
                logErrorEvent({
                    source: "user",
                    type: "form_campaign_not_found",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `campaignId:${campaignId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" });
            }
            const now = new Date();
            if (campaign.beginsAt && new Date(campaign.beginsAt) > now) {
                logErrorEvent({
                    source: "user",
                    type: "form_campaign_not_started",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `campaignId:${campaignId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія ще не розпочалася" });
            }
            if (campaign.endsAt && new Date(campaign.endsAt) < now) {
                logErrorEvent({
                    source: "user",
                    type: "form_campaign_ended",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `campaignId:${campaignId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія вже завершилася" });
            }

            const existingApplication = await db.query.applications.findFirst({
                where: {
                    studentId: studentId,
                    campaignId: campaignId,
                    state: "submitted",
                },
            });
            if (
                existingApplication &&
                (!campaign.allowMultipleProfiles || existingApplication.profileId === input.profileId)
            ) {
                logErrorEvent({
                    source: "user",
                    type: "form_duplicate_application",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user?.id,
                    message: `studentId:${studentId},campaignId:${campaignId},profileId:${input.profileId}`,
                });
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: `Заява для цієї дитини${existingApplication.profileId === input.profileId ? " (на цей профіль)" : ""} в цій кампанії вже існує`,
                });
            }

            await storeFiles(form, formFields, context.locals.user.id);

            const draft =
                input.draftId == null
                    ? undefined
                    : await db.query.applications.findFirst({
                          where: { id: input.draftId, userId: context.locals.user.id, state: "draft" },
                      });
            if (input.draftId != null && !draft) {
                logErrorEvent({
                    source: "user",
                    type: "form_draft_missing",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                    message: `draftId:${input.draftId}`,
                });
            }

            const values = {
                studentId: studentId,
                userId: context.locals.user.id,
                state: "submitted" as const,
                answers: formFields,
                formId: input.formId,
                profileId: input.profileId,
                campaignId: campaignId,
            };

            if (draft) {
                await db.update(applications).set(values).where(eq(applications.id, draft.id));
                logEvent({
                    type: "draft_save",
                    user: context.locals.user,
                    path: context.url?.pathname,
                    target: "applications",
                    targetId: draft.id,
                });
                return { success: true, id: draft.id };
            }

            const result = await db.insert(applications).values(values).returning({ id: applications.id });

            logEvent({
                type: "application_submit",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applications",
                targetId: result[0].id,
                detail: `profileId:${input.profileId},campaignId:${campaignId}`,
            });
            return { success: true, id: result[0].id };
        } catch (e) {
            if (e instanceof ActionError) throw e;
            console.error(e);
            logErrorEvent({
                source: "server",
                type: "form_submit_exception",
                path: context.url?.pathname || "/",
                userId: context.locals.user?.id,
                message: e instanceof Error ? e.message : String(e),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const updateApplicationAnswers = defineAction({
    accept: "form",
    input: z.looseObject({
        applicationId: z.coerce.number().int().positive(),

        studentfirstName: z.string().min(1, "Вкажіть ім'я учня"),
        studentlastName: z.string().min(1, "Вкажіть прізвище учня"),
        studentmiddleName: z.string().optional(),

        studentBirthDate: birthDate,
        studentTelephone: z.string().regex(/^380\d{9}$/, "Введіть номер у форматі 380XXXXXXXXX"),

        parentfirstName: z.string().min(1, "Вкажіть ім'я"),
        parentlastName: z.string().min(1, "Вкажіть прізвище"),
        parentmiddleName: z.string().optional(),

        parentBirthDate: birthDate,
        parentTelephone: z.string().regex(/^380\d{9}$/, "Введіть номер у форматі 380XXXXXXXXX"),
    }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            if (!user) throw new ActionError({ code: "UNAUTHORIZED" });

            const db = getDrizzle();
            const application = await db.query.applications.findFirst({
                where: { id: input.applicationId, state: "submitted" },
                with: { form: true },
            });
            // Only the application's parent or student may see or edit it.
            if (!application || (application.userId !== user.id && application.studentId !== user.id)) {
                throw new ActionError({ code: "NOT_FOUND", message: "Заяву не знайдено" });
            }
            if (application.status !== "attention") {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "Редагування доступне лише для заяв зі статусом «Зверніть увагу»",
                });
            }
            const form = application.form;
            if (!form) throw new ActionError({ code: "BAD_REQUEST" });

            let rawForm: FormData | null = null;
            try {
                rawForm = await context.request.formData();
            } catch {
                rawForm = null;
            }

            if (
                user.role !== "admin" &&
                !(await verifyTurnstile(rawForm?.get("cf-turnstile-response"), context.request))
            ) {
                logErrorEvent({
                    source: "user",
                    type: "form_edit_turnstile_failed",
                    path: context.url?.pathname || "/",
                    userId: user.id,
                });
                throw new ActionError({ code: "FORBIDDEN", message: "Підтвердіть, що ви не робот" });
            }

            const { formFields, errors, fieldErrors } = await collectAnswers(
                form,
                rawForm,
                input as Record<string, unknown>,
                user.id,
                context.url?.pathname || "/",
                application.answers,
            );
            if (errors.length > 0) return { success: false, message: errors.join("; "), fieldErrors };

            await storeFiles(form, formFields, user.id);

            await db
                .update(users)
                .set({
                    firstName: input.parentfirstName,
                    lastName: input.parentlastName,
                    middleName: input.parentmiddleName || null,
                    birthDate: input.parentBirthDate,
                    phone: input.parentTelephone,
                })
                .where(eq(users.id, application.userId));

            if (application.studentId != null) {
                await db
                    .update(users)
                    .set({
                        firstName: input.studentfirstName,
                        lastName: input.studentlastName,
                        middleName: input.studentmiddleName || null,
                        birthDate: input.studentBirthDate,
                        phone: input.studentTelephone,
                    })
                    .where(eq(users.id, application.studentId));
            }

            await db
                .update(applications)
                .set({ answers: formFields, status: "pending" })
                .where(eq(applications.id, application.id));

            logEvent({
                type: "application_edit",
                user,
                path: context.url?.pathname,
                target: "applications",
                targetId: application.id,
            });
            return { success: true, id: application.id };
        } catch (e) {
            if (e instanceof ActionError) throw e;
            console.error(e);
            logErrorEvent({
                source: "server",
                type: "application_edit_exception",
                userId: context.locals.user?.id,
                message: e instanceof Error ? e.message : String(e),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const saveDraft = defineAction({
    accept: "form",
    input: z.looseObject({
        formId: z.number(),
        profileId: z.number().int().positive(),
        draftId: optionalId,
        studentId: optionalId,

        studentfirstName: z.string().optional(),
        studentlastName: z.string().optional(),
        studentmiddleName: z.string().optional(),
        studentBirthDate: z.string().optional(),
        studentTelephone: z.string().optional(),

        parentfirstName: z.string().optional(),
        parentlastName: z.string().optional(),
        parentmiddleName: z.string().optional(),
        parentBirthDate: z.string().optional(),
        parentTelephone: z.string().optional(),
    }),
    handler: async (input, context) => {
        try {
            const db = getDrizzle();
            if (!context.locals.user) {
                logErrorEvent({ source: "user", type: "form_draft_unauthorized", path: context.url?.pathname || "/" });
                throw new ActionError({ code: "UNAUTHORIZED" });
            }
            if (context.locals.user.role === "applicant") {
                logErrorEvent({
                    source: "user",
                    type: "form_draft_forbidden_role",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                });
                throw new ActionError({ code: "FORBIDDEN", message: "Абітурієнти не можуть створювати заяви" });
            }

            const form = await db.query.forms.findFirst({ where: { id: input.formId } });
            const profile = await db.query.profiles.findFirst({ where: { id: input.profileId } });
            if (!form || !profile || profile.formId !== form.id) {
                logErrorEvent({
                    source: "user",
                    type: "form_draft_not_found",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                    message: `formId:${input.formId},profileId:${input.profileId}`,
                });
                throw new ActionError({ code: "BAD_REQUEST" });
            }

            let rawForm: FormData | null = null;
            try {
                rawForm = await context.request.formData();
            } catch {
                rawForm = null;
            }

            const answers: Record<string, unknown> = {};
            for (const field of form.schema) {
                const key = "form-" + field.slug;
                const uploadedKey = rawForm?.get("upload-" + field.slug);
                answers[field.slug] =
                    field.type === "file"
                        ? isFileKey(uploadedKey, context.locals.user.id, field.slug)
                            ? { key: uploadedKey }
                            : ""
                        : field.type === "multiselect"
                          ? rawForm
                              ? rawForm
                                    .getAll(key)
                                    .map(String)
                                    .filter((v) => v !== "")
                              : []
                          : rawForm
                            ? (rawForm.get(key) ?? "")
                            : ((input as Record<string, unknown>)[key] ?? "");
            }
            answers.__student = {
                firstName: (input.studentfirstName ?? "").trim(),
                lastName: (input.studentlastName ?? "").trim(),
                middleName: (input.studentmiddleName ?? "").trim(),
                birthDate: input.studentBirthDate ?? "",
                telephone: (input.studentTelephone ?? "").trim(),
            };
            answers.__parent = {
                firstName: (input.parentfirstName ?? "").trim(),
                lastName: (input.parentlastName ?? "").trim(),
                middleName: (input.parentmiddleName ?? "").trim(),
                birthDate: input.parentBirthDate ?? "",
                telephone: (input.parentTelephone ?? "").trim(),
            };

            let studentId: number | null = null;
            if (input.studentId != null) {
                const student = await db.query.users.findFirst({ where: { id: input.studentId } });
                if (!student || student.role !== "applicant" || student.parentId !== context.locals.user.id) {
                    logErrorEvent({
                        source: "user",
                        type: "form_draft_student_invalid",
                        path: context.url?.pathname || "/",
                        userId: context.locals.user.id,
                        message: `studentId:${input.studentId}`,
                    });
                    throw new ActionError({ code: "BAD_REQUEST", message: "Учня не знайдено серед ваших дітей" });
                }
                studentId = student.id;
            }

            const campaignAssignment = await db.query.campaignsToProfiles.findFirst({
                where: { profileId: input.profileId },
            });
            if (!campaignAssignment) {
                logErrorEvent({
                    source: "user",
                    type: "form_draft_campaign_assignment_missing",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                    message: `profileId:${input.profileId}`,
                });
            }

            const values = {
                userId: context.locals.user.id,
                studentId,
                formId: form.id,
                profileId: profile.id,
                campaignId: campaignAssignment?.campaignId ?? null,
                answers,
                state: "draft" as const,
            };

            // Fall back to the user's existing draft for this profile so a fresh page does not create a second one
            const requestedDraft =
                input.draftId == null
                    ? undefined
                    : await db.query.applications.findFirst({
                          where: { id: input.draftId, userId: context.locals.user.id, state: "draft" },
                      });
            if (input.draftId != null && !requestedDraft) {
                logErrorEvent({
                    source: "user",
                    type: "form_draft_missing",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                    message: `draftId:${input.draftId}`,
                });
            }
            const draft =
                requestedDraft ??
                (await db.query.applications.findFirst({
                    where: {
                        userId: context.locals.user.id,
                        profileId: profile.id,
                        state: "draft",
                        // Per child, so a second child's draft does not overwrite the first one.
                        // A hand-typed child has no id yet, so those share the null draft.
                        // shortcut: only one in-progress draft per hand-typed child, key by name if that becomes a real case
                        studentId: studentId ?? { isNull: true },
                    },
                }));
            if (draft) {
                await db
                    .update(applications)
                    .set(values)
                    .where(and(eq(applications.id, draft.id), eq(applications.state, "draft")));
                return { id: draft.id };
            }

            const created = await db.insert(applications).values(values).returning({ id: applications.id });
            logEvent({
                type: "draft_save",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applications",
                targetId: created[0].id,
            });
            return { id: created[0].id };
        } catch (e) {
            if (e instanceof ActionError) throw e;
            console.error(e);
            logErrorEvent({
                source: "server",
                type: "form_draft_exception",
                path: context.url?.pathname || "/",
                userId: context.locals.user?.id,
                message: e instanceof Error ? e.message : String(e),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteDraft = defineAction({
    accept: "form",
    input: z.object({
        applicationId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user) {
                logErrorEvent({
                    source: "user",
                    type: "draft_delete_unauthorized",
                    path: context.url?.pathname || "/",
                });
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const draft = await db.query.applications.findFirst({
                where: { id: input.applicationId, userId: context.locals.user.id, state: "draft" },
            });
            if (!draft) {
                logErrorEvent({
                    source: "user",
                    type: "draft_delete_not_found",
                    path: context.url?.pathname || "/",
                    userId: context.locals.user.id,
                    message: `applicationId:${input.applicationId}`,
                });
                throw new ActionError({ code: "NOT_FOUND", message: "Чернетку не знайдено" });
            }

            await db.delete(applications).where(eq(applications.id, draft.id));
            logEvent({
                type: "draft_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applications",
                targetId: draft.id,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            logErrorEvent({
                source: "server",
                type: "draft_delete_exception",
                userId: context.locals.user?.id,
                message: error instanceof Error ? error.message : String(error),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const submitFormEdit = defineAction({
    accept: "json",
    input: z.object({
        title: z.string().nonempty(),
        description: z.string(),
        schema: z
            .array(
                z.object({
                    slug: z.string(),
                    title: z.string(),
                    type: z.enum(["number", "date", "text", "file", "select", "multiselect"]),
                    regex: z.string(),
                    max: z.number(),
                    min: z.number(),
                    required: z.boolean().optional(),
                    options: z.array(z.string()).optional(),
                }),
            )
            .nonempty(),
        formId: z.number().optional(),
        profileId: z.number().int().positive().optional(),
    }),
    handler: async (input, context) => {
        try {
            const db = getDrizzle();
            if (!context.locals.user) throw new ActionError({ code: "UNAUTHORIZED" });
            if (context.locals.user.role !== "admin") throw new ActionError({ code: "UNAUTHORIZED" });

            const profile = input.profileId
                ? await db.query.profiles.findFirst({ where: { id: input.profileId } })
                : undefined;
            if (input.profileId && !profile)
                throw new ActionError({ code: "BAD_REQUEST", message: "Профіль не знайдено" });
            if (!input.formId && !profile)
                throw new ActionError({ code: "BAD_REQUEST", message: "Спочатку збережіть профіль" });

            let formId: number;
            if (!input.formId) {
                const [createdForm] = await db
                    .insert(forms)
                    .values({
                        title: input.title,
                        description: input.description,
                        schema: input.schema,
                    })
                    .returning({ id: forms.id });
                formId = createdForm.id;
            } else {
                const form = await db.query.forms.findFirst({ where: { id: input.formId } });
                // A stale editor can point at a form that was deleted elsewhere; keep its content
                // by saving it as a new form.
                if (!form) {
                    const [createdForm] = await db
                        .insert(forms)
                        .values({
                            title: input.title,
                            description: input.description,
                            schema: input.schema,
                        })
                        .returning({ id: forms.id });
                    formId = createdForm.id;
                } else {
                    await db
                        .update(forms)
                        .set({
                            title: input.title,
                            description: input.description,
                            schema: input.schema,
                        })
                        .where(eq(forms.id, form.id));
                    formId = form.id;
                }
            }

            if (profile && profile.formId !== formId) {
                const previousFormId = profile.formId;
                await db.update(profiles).set({ formId }).where(eq(profiles.id, profile.id));
                if (previousFormId) await deleteFormIfUnused(db, previousFormId);
            }

            logEvent({
                type: input.formId ? "form_update" : "form_create",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "forms",
                targetId: formId,
            });
            return { success: true, formId };
        } catch (e) {
            if (e instanceof ActionError) throw e;
            console.error(e);
            logErrorEvent({
                source: "server",
                type: "form_edit_exception",
                userId: context.locals.user?.id,
                message: e instanceof Error ? e.message : String(e),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteForm = defineAction({
    accept: "json",
    input: z.object({
        formId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingForm = await db.query.forms.findFirst({
                where: { id: input.formId },
            });
            if (!existingForm) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Форму не знайдено" });
            }

            // applications.form_id cascades, so deleting the form would erase submitted applications.
            const submittedCount = await db.$count(
                applications,
                and(eq(applications.formId, input.formId), eq(applications.state, "submitted")),
            );
            if (submittedCount > 0) {
                throw new ActionError({ code: "BAD_REQUEST", message: "За цією формою вже є подані заяви" });
            }

            await db.update(profiles).set({ formId: null }).where(eq(profiles.formId, input.formId));
            await db.delete(forms).where(eq(forms.id, input.formId));
            logEvent({
                type: "form_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "forms",
                targetId: input.formId,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            logErrorEvent({
                source: "server",
                type: "form_delete_exception",
                userId: context.locals.user?.id,
                message: error instanceof Error ? error.message : String(error),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const updateApplication = defineAction({
    accept: "json",
    input: z.object({
        applicationId: z.number().int().positive(),
        status: z.enum(APPLICATION_STATUSES, "Некоректний статус"),
        notes: z.string().max(5000).default(""),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const application = await db.query.applications.findFirst({
                where: { id: input.applicationId, state: "submitted" },
            });
            if (!application) {
                throw new ActionError({ code: "NOT_FOUND", message: "Заяву не знайдено" });
            }

            await db
                .update(applications)
                .set({ status: input.status, notes: input.notes })
                .where(eq(applications.id, application.id));

            logEvent({
                type: "application_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applications",
                targetId: application.id,
                detail: `status:${input.status}`,
            });
            return { success: true, status: input.status, notes: input.notes };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            logErrorEvent({
                source: "server",
                type: "application_update_exception",
                userId: context.locals.user?.id,
                message: error instanceof Error ? error.message : String(error),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteApplications = defineAction({
    accept: "json",
    input: z.object({
        applicationIds: z.array(z.number().int().positive()).min(1),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const records = await db.select().from(applications).where(inArray(applications.id, input.applicationIds));
            if (records.length === 0) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Заяв не знайдено" });
            }

            const fileKeys = records.flatMap(({ answers }) =>
                Object.values(answers).flatMap((answer) => {
                    if (typeof answer !== "object" || answer === null || !("key" in answer)) {
                        return [];
                    }
                    const key = answer.key;
                    return typeof key === "string" && key.startsWith("applications/") ? [key] : [];
                }),
            );
            if (fileKeys.length > 0) {
                await env.FILE_BUCKET.delete(fileKeys);
            }

            await db.delete(applications).where(inArray(applications.id, input.applicationIds));
            logEvent({
                type: "applications_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applications",
                targetId: input.applicationIds.join(","),
                detail: `deleted:${records.length}`,
            });
            return { success: true, deletedCount: records.length };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            logErrorEvent({
                source: "server",
                type: "applications_delete_exception",
                userId: context.locals.user?.id,
                message: error instanceof Error ? error.message : String(error),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const applicantLink = defineAction({
    accept: "form",
    input: z.object({
        applicationId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role === "applicant") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const application = await db.query.applications.findFirst({
                where: { id: input.applicationId, userId: context.locals.user.id },
            });
            // Drafts have no student yet, so an invite for one can never be claimed.
            if (!application || application.state !== "submitted" || !application.studentId) {
                throw new ActionError({ code: "BAD_REQUEST" });
            }
            const student = await db.query.users.findFirst({ where: { id: application.studentId } });
            if (!student) {
                throw new ActionError({ code: "NOT_FOUND", message: "Учня не знайдено" });
            }
            if (student.externalId) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Учень уже має акаунт, посилання не потрібне" });
            }
            const existingInvite = await db.query.applicantInvites.findFirst({
                where: { applicationId: application.id },
            });
            if (existingInvite) {
                return { success: true, id: existingInvite.id };
            }
            const newInvite = await db
                .insert(applicantInvites)
                .values({
                    applicationId: application.id,
                })
                .returning({ id: applicantInvites.id });

            logEvent({
                type: "applicant_link",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "applicantInvites",
                targetId: newInvite[0].id,
                detail: `applicationId:${application.id}`,
            });
            return { success: true, id: newInvite[0].id };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            logErrorEvent({
                source: "server",
                type: "applicant_link_exception",
                userId: context.locals.user?.id,
                message: error instanceof Error ? error.message : String(error),
            });
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
