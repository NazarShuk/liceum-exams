import { ActionError, defineAction } from "astro:actions";
import {z} from "astro/zod";
import { eq, inArray } from "drizzle-orm";
import { getDrizzle } from "../db/drizzle";
import { applications, forms, profiles, users, applicantInvites} from "@db/schema";
import { env } from "cloudflare:workers";
import { logErrorEvent } from "../lib/analytics";

type Schema = NonNullable<typeof forms.$inferSelect["schema"]>;
type Field = Schema[number]
const birthDate = z.string().min(1, "Вкажіть дату народження").pipe(z.coerce.date());

const dayOf = (value: Date | null | undefined) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

function validateAnswer(field: Field, value: unknown): string | null {
    const required = field.required !== false
    const label = field.title || field.slug
    const options = field.options ?? []

    if (field.type === "multiselect") {
        const values = (Array.isArray(value) ? value : value == null ? [] : [value])
            .map(String)
            .filter(Boolean)
        if (required && values.length === 0)
            return `"${label}": виберіть хоча б один варіант`
        if (!values.every((v) => options.includes(v)))
            return `"${label}": некоректне значення`
        if (field.min > 0 && values.length < field.min)
            return `"${label}": виберіть щонайменше ${field.min}`
        if (field.max > 0 && values.length > field.max)
            return `"${label}": виберіть не більше ${field.max}`
        return null
    }

    const str = value == null ? "" : String(value)
    if (str.trim() === "")
        return required ? `"${label}": обов'язкове поле` : null

    if (field.type === "number") {
        const num = Number(str)
        if (!Number.isFinite(num))
            return `"${label}": введіть число`
        if (field.min > 0 && num < field.min)
            return `"${label}": мінімум ${field.min}`
        if (field.max > 0 && num > field.max)
            return `"${label}": максимум ${field.max}`
    }

    if (field.type === "date" && Number.isNaN(Date.parse(str)))
        return `"${label}": некоректна дата`

    if (field.type === "select" && !options.includes(str))
        return `"${label}": некоректне значення`

    if (field.regex) {
        try {
            if (!new RegExp("^(?:" + field.regex + ")$").test(str))
                return `"${label}": невірний формат`
        } catch {
            // malformed regex — skip validation
        }
    }

    if (field.type === "text") {
        if (field.min > 0 && str.length < field.min)
            return `"${label}": мінімум ${field.min} символів`
        if (field.max > 0 && str.length > field.max)
            return `"${label}": максимум ${field.max} символів`
    }

    return null
}

export const submitForm = defineAction({
    accept: "form",
    input: z.looseObject({
        formId: z.number(),
        profileId: z.number().int().positive(),

        studentId: z.preprocess(
            (v) => (v === "" || v == null ? undefined : v),
            z.coerce.number().int().positive().optional()
        ),
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
        try{
            const db = getDrizzle()
            if (!context.locals.user) {
                logErrorEvent({ source: "user", type: "form_unauthorized", path: context.url?.pathname || "/" });
                throw new ActionError({code: "UNAUTHORIZED"})
            }

            const form = await db.query.forms.findFirst({where: {id:input.formId}})
            if (!form) {
                logErrorEvent({ source: "user", type: "form_not_found", path: context.url?.pathname || "/", userId: context.locals.user?.id });
                throw new ActionError({code: "BAD_REQUEST"})
            }

            const profile = await db.query.profiles.findFirst({where: {id:input.profileId}})
            if (!profile || profile.formId !== form.id) {
                logErrorEvent({ source: "user", type: "form_profile_mismatch", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `formId:${form.id},profileId:${input.profileId}` });
                throw new ActionError({code: "BAD_REQUEST"})
            }

            let rawForm: FormData | null = null
            try {
                rawForm = await context.request.formData()
            } catch {
                rawForm = null
            }

            const formFields: Record<string, unknown> = {}
            const errors: string[] = []
            const fieldErrors: Record<string, string> = {}
            for (const field of form.schema) {
                const key = "form-" + field.slug
                const value = field.type === "multiselect"
                    ? rawForm
                        ? rawForm.getAll(key).map(String).filter((v) => v !== "")
                        : (input as Record<string, unknown>)[key] ?? []
                    : rawForm
                        ? rawForm.get(key) ?? ""
                        : (input as Record<string, unknown>)[key] ?? ""

                formFields[field.slug] = value
                const error = validateAnswer(field, value)
                if (error) {
                    errors.push(error)
                    fieldErrors[key] = error
                    logErrorEvent({
                        source: "user",
                        type: "form_validation_error",
                        path: context.url?.pathname || "/",
                        field: field.slug,
                        value: typeof value === "string" ? value.slice(0, 200) : Array.isArray(value) ? value.map(String).join(",").slice(0, 200) : "",
                        userId: context.locals.user?.id,
                    })
                }
            }
            if (errors.length > 0)
                return {success: false, message: errors.join("; "), fieldErrors}

            await db.update(users).set({
                firstName: input.parentfirstName,
                lastName: input.parentlastName,
                middleName: input.parentmiddleName || null,
                birthDate: input.parentBirthDate,
                phone: input.parentTelephone,
            }).where(eq(users.id, context.locals.user.id))

            let studentId = input.studentId

            if (studentId == null){
                if (!input.studentfirstName || !input.studentlastName || !input.studentTelephone || !input.studentBirthDate) {
                    logErrorEvent({ source: "user", type: "form_student_missing_fields", path: context.url?.pathname || "/", userId: context.locals.user?.id });
                    throw new ActionError({code: "BAD_REQUEST", message: "Заповніть інформацію про учня"})
                }

                // Reuse an existing child with the same identity instead of creating a duplicate
                const siblings = await db.query.users.findMany({ where: { parentId: context.locals.user.id } })
                const duplicate = siblings.find((sibling) =>
                    sibling.firstName.trim().toLowerCase() === input.studentfirstName.trim().toLowerCase() &&
                    sibling.lastName.trim().toLowerCase() === input.studentlastName.trim().toLowerCase() &&
                    dayOf(sibling.birthDate) === dayOf(input.studentBirthDate)
                )

                if (duplicate) {
                    studentId = duplicate.id
                } else {
                    const created = await db.insert(users).values({
                        firstName: input.studentfirstName,
                        lastName: input.studentlastName,
                        middleName: input.studentmiddleName || null,
                        phone: input.studentTelephone,
                        birthDate: new Date(input.studentBirthDate),
                        role: "applicant",
                        parentId: context.locals.user.id
                    }).returning({id: users.id})

                    studentId = created[0].id
                }
            } else {
                const student = await db.query.users.findFirst({where: {id: studentId}})
                if (!student || student.role !== "applicant" || student.parentId !== context.locals.user.id) {
                    logErrorEvent({ source: "user", type: "form_student_invalid", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `studentId:${studentId}` });
                    throw new ActionError({code: "BAD_REQUEST", message: "Учня не знайдено серед ваших дітей"})
                }
            }

            const campaignAssignment = await db.query.campaignsToProfiles.findFirst({
                where: { profileId: input.profileId }
            })
            if (!campaignAssignment) {
                logErrorEvent({ source: "user", type: "form_campaign_assignment_missing", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `profileId:${input.profileId}` });
                throw new ActionError({code: "BAD_REQUEST", message: "Профіль не належить жодній кампанії"})
            }
            const campaignId = campaignAssignment.campaignId
            const campaign = await db.query.campaigns.findFirst({ where: { id: campaignId } })
            if (!campaign) {
                logErrorEvent({ source: "user", type: "form_campaign_not_found", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `campaignId:${campaignId}` });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" })
            }
            const now = new Date()
            if (campaign.beginsAt && new Date(campaign.beginsAt) > now) {
                logErrorEvent({ source: "user", type: "form_campaign_not_started", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `campaignId:${campaignId}` });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія ще не розпочалася" })
            }
            if (campaign.endsAt && new Date(campaign.endsAt) < now) {
                logErrorEvent({ source: "user", type: "form_campaign_ended", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `campaignId:${campaignId}` });
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія вже завершилася" })
            }

            const existingApplication = await db.query.applications.findFirst({
                where: {
                    studentId: studentId,
                    campaignId: campaignId
                }
            })
            if (existingApplication && (!campaign.allowMultipleProfiles || existingApplication.profileId === input.profileId)) {
                logErrorEvent({ source: "user", type: "form_duplicate_application", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: `studentId:${studentId},campaignId:${campaignId},profileId:${input.profileId}` });
                throw new ActionError({code: "BAD_REQUEST", message: `Заява для цієї дитини${existingApplication.profileId === input.profileId ? ' (на цей профіль)' : ''} в цій кампанії вже існує`})
            }
            

            for (const field in formFields) {
                const file = formFields[field]
                if (file instanceof File) {
                    const key = `applications/${context.locals.user.id}/${crypto.randomUUID()}/${encodeURIComponent(field)}`
                    await env.FILE_BUCKET.put(key, await file.arrayBuffer(), {
                        customMetadata: {
                            owner: context.locals.user.id.toString(),
                            fileName: file.name,
                            fileType: file.type
                        },
                    })
                    formFields[field] = { key }
                }
            }

            const result = await db.insert(applications).values({
                studentId: studentId,
                userId: context.locals.user.id,
                state: "submitted",
                answers: formFields,
                formId: input.formId,
                profileId: input.profileId,
                campaignId: campaignId
            }).returning({id: applications.id})

            return {success: true, id: result[0].id}
        }
        catch(e){
            if (e instanceof ActionError) throw e
            console.error(e)
            try {
                logErrorEvent({ source: "server", type: "form_submit_exception", path: context.url?.pathname || "/", userId: context.locals.user?.id, message: e instanceof Error ? e.message : String(e) });
            } catch {}
            throw new ActionError({code: "INTERNAL_SERVER_ERROR"})
        }
    }
})

export const submitFormEdit = defineAction({
    accept: "json",
    input: z.object({
        title: z.string().nonempty(),
        description: z.string(),
        schema: z.array(z.object({
            slug: z.string(),
            title: z.string(),
            type: z.enum(["number", "date", "text", "file", "select", "multiselect"]),
            regex: z.string(),
            max: z.number(),
            min: z.number(),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional(),
        })).nonempty(),
        formId: z.number().optional(),
    }),
    handler: async(input, context)=> {
        try{
            const db = getDrizzle()
            if (!context.locals.user)
                throw new ActionError({code: "UNAUTHORIZED"})
            if (context.locals.user.role !== "admin")
                throw new ActionError({code: "UNAUTHORIZED"})

            let formId: number
            if (!input.formId){
                const [createdForm] = await db.insert(forms).values({
                    title: input.title,
                    description: input.description,
                    schema: input.schema,
                }).returning({ id: forms.id })
                formId = createdForm.id
            }
            else{
                const form = await db.query.forms.findFirst({where: {id: input.formId}})
                if (!form){
                    const [createdForm] = await db.insert(forms).values({
                        title: input.title,
                        description: input.description,
                        schema: input.schema,
                    }).returning({ id: forms.id })
                    formId = createdForm.id
                }
                else{
                    await db.update(forms).set({
                        title: input.title,
                        description: input.description,
                        schema: input.schema,
                    }).where(eq(forms.id, input.formId))
                    formId = form.id
                }
            }

            return {success: true, formId}
        }
        catch(e){
            if (e instanceof ActionError) throw e
            console.error(e)
            try { logErrorEvent({ source: "server", type: "form_edit_exception", userId: context.locals.user?.id, message: e instanceof Error ? e.message : String(e) }); } catch {}
            throw new ActionError({code: "INTERNAL_SERVER_ERROR"})
        }
    }
})

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

            await db.update(profiles).set({ formId: null }).where(eq(profiles.formId, input.formId));
            await db.delete(forms).where(eq(forms.id, input.formId));
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            try { logErrorEvent({ source: "server", type: "form_delete_exception", userId: context.locals.user?.id, message: error instanceof Error ? error.message : String(error) }); } catch {}
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
            const records = await db
                .select()
                .from(applications)
                .where(inArray(applications.id, input.applicationIds));
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
            return { success: true, deletedCount: records.length };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            try { logErrorEvent({ source: "server", type: "applications_delete_exception", userId: context.locals.user?.id, message: error instanceof Error ? error.message : String(error) }); } catch {}
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const applicantLink = defineAction({
    accept: "form",
    input: z.object({
        applicationId: z.number().int().positive()
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role === "applicant") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const application = await db.query.applications.findFirst({where: {id: input.applicationId, userId: context.locals.user.id}})
            if (!application) {
                throw new ActionError({ code: "BAD_REQUEST" });
            }
            const existingInvite = await db.query.applicantInvites.findFirst({where: {applicationId: application.id}})
            if (existingInvite) {
                return { success: true, id: existingInvite.id};
            }
            const newInvite = await db.insert(applicantInvites).values({
                applicationId: application.id
            }).returning({id: applicantInvites.id})

            return { success: true, id: newInvite[0].id};
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            try { logErrorEvent({ source: "server", type: "applicant_link_exception", userId: context.locals.user?.id, message: error instanceof Error ? error.message : String(error) }); } catch {}
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }
})