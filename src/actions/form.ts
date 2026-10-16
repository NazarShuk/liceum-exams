import { ActionError, defineAction } from "astro:actions";
import {z} from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "../db/drizzle";
import { applications, forms, profiles, users } from "@db/schema";
type Schema = NonNullable<typeof forms.$inferSelect["schema"]>;
type Field = Schema[number]
const birthDate = z.string().min(1, "Вкажіть дату народження").pipe(z.coerce.date());

function validateAnswer(field: Field, value: unknown): string | null {
    const required = field.required !== false
    const label = field.title || field.slug
    const options = field.options ?? []

    if (field.type === "multiselect") {
        const values = (Array.isArray(value) ? value : value == null ? [] : [value])
            .map(String)
            .filter(Boolean)
        if (required && values.length === 0)
            return `«${label}»: виберіть хоча б один варіант`
        if (!values.every((v) => options.includes(v)))
            return `«${label}»: некоректне значення`
        if (field.min > 0 && values.length < field.min)
            return `«${label}»: виберіть щонайменше ${field.min}`
        if (field.max > 0 && values.length > field.max)
            return `«${label}»: виберіть не більше ${field.max}`
        return null
    }

    const str = value == null ? "" : String(value)
    if (str.trim() === "")
        return required ? `«${label}»: обов'язкове поле` : null

    if (field.type === "number") {
        const num = Number(str)
        if (!Number.isFinite(num))
            return `«${label}»: введіть число`
        if (field.min > 0 && num < field.min)
            return `«${label}»: мінімум ${field.min}`
        if (field.max > 0 && num > field.max)
            return `«${label}»: максимум ${field.max}`
    }

    if (field.type === "date" && Number.isNaN(Date.parse(str)))
        return `«${label}»: некоректна дата`

    if (field.type === "select" && !options.includes(str))
        return `«${label}»: некоректне значення`

    if (field.regex) {
        try {
            if (!new RegExp("^(?:" + field.regex + ")$").test(str))
                return `«${label}»: невірний формат`
        } catch {
            // malformed regex — skip validation
        }
    }

    if (field.type === "text") {
        if (field.min > 0 && str.length < field.min)
            return `«${label}»: мінімум ${field.min} символів`
        if (field.max > 0 && str.length > field.max)
            return `«${label}»: максимум ${field.max} символів`
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
        studentfirstName: z.string(),
        studentlastName: z.string(),
        studentmiddleName: z.string().optional(),

        studentBirthDate: z.string().optional(),
        studentTelephone: z.string(),

        parentfirstName: z.string().nonempty(),
        parentlastName: z.string().nonempty(),
        parentmiddleName: z.string().optional(),

        parentBirthDate: birthDate,
        parentTelephone: z.string().nonempty(),
    }),
    handler: async (input, context) => {
        try{
            const db = getDrizzle()
            if (!context.locals.user)
                throw new ActionError({code: "UNAUTHORIZED"})

            const form = await db.query.forms.findFirst({where: {id:input.formId}})
            if (!form)
                throw new ActionError({code: "BAD_REQUEST"})

            const profile = await db.query.profiles.findFirst({where: {id:input.profileId}})
            if (!profile || profile.formId !== form.id)
                throw new ActionError({code: "BAD_REQUEST"})

            let rawForm: FormData | null = null
            try {
                rawForm = await context.request.formData()
            } catch {
                rawForm = null
            }

            const formFields: Record<string, unknown> = {}
            const errors: string[] = []
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
                if (error) errors.push(error)
            }
            if (errors.length > 0)
                throw new ActionError({code: "BAD_REQUEST", message: errors.join("; ")})


            await db.update(users).set({
                firstName: input.parentfirstName,
                lastName: input.parentlastName,
                middleName: input.parentmiddleName || null,
                birthDate: input.parentBirthDate,
                phone: input.parentTelephone,
            }).where(eq(users.id, context.locals.user.id))

            let studentId = input.studentId

            if (studentId == null){
                if (!input.studentfirstName || !input.studentlastName || !input.studentTelephone || !input.studentBirthDate)
                    throw new ActionError({code: "BAD_REQUEST", message: "Заповніть інформацію про учня"})

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
            } else {
                const student = await db.query.users.findFirst({where: {id: studentId}})
                if (!student || student.role !== "applicant" || student.parentId !== context.locals.user.id)
                    throw new ActionError({code: "BAD_REQUEST", message: "Учня не знайдено серед ваших дітей"})
            }

            const campaignAssignment = await db.query.campaignsToProfiles.findFirst({
                where: { profileId: input.profileId }
            })
            if (!campaignAssignment) {
                throw new ActionError({code: "BAD_REQUEST", message: "Профіль не належить жодній кампанії"})
            }
            const campaignId = campaignAssignment.campaignId
            const campaign = await db.query.campaigns.findFirst({ where: { id: campaignId } })
            if (!campaign) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" })
            }
            const now = new Date()
            if (campaign.beginsAt && new Date(campaign.beginsAt) > now) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія ще не розпочалася" })
            }
            if (campaign.endsAt && new Date(campaign.endsAt) < now) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанія вже завершилася" })
            }

            const existingApplication = await db.query.applications.findFirst({
                where: {
                    studentId: studentId,
                    campaignId: campaignId
                }
            })
            if (existingApplication) {
                throw new ActionError({code: "BAD_REQUEST", message: "Заява для цієї дитини в цій кампанії вже існує"})
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
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
