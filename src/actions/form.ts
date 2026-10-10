import { ActionError, defineAction } from "astro:actions";
import {z} from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "../db/drizzle";
import { applications, forms, profiles, users } from "@db/schema";
type Schema = NonNullable<typeof forms.$inferSelect["schema"]>;
type Field = Schema[number]
const birthDate = z.string().min(1, "Вкажіть дату народження").pipe(z.coerce.date());

export const submitForm = defineAction({
    accept: "form",
    input: z.looseObject({
        formId: z.number(),

        studentId: z.coerce.number().optional(),
        studentfirstName: z.string().nonempty(),
        studentlastName: z.string().nonempty(),
        studentmiddleName: z.string(),

        studentBirthDate: birthDate,
        studentTelephone: z.string().nonempty(),

        parentfirstName: z.string().nonempty(),
        parentlastName: z.string().nonempty(),
        parentmiddleName: z.string(),

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
            
            // TODO: add validation for these
            const formFields = Object.entries(input)
                .filter(([key]) => key.startsWith("form-"))
                .reduce((acc, [key, value]) => {
                    acc[key.replace(/^form-/, "")] = value;
                    return acc;
                }, {} as Record<string, unknown>);
            console.log(formFields)

            let hasAllFields = true
            form.schema.forEach(field=>{
                if (!formFields[field.slug]){
                    hasAllFields = false
                }
            })
            if (!hasAllFields)
                throw new ActionError({code: "BAD_REQUEST"})


            await db.update(users).set({
                firstName: input.parentfirstName,
                lastName: input.parentlastName,
                middleName: input.parentmiddleName,
                birthDate: input.parentBirthDate,
                phone: input.parentTelephone,
            }).where(eq(users.id, context.locals.user.id))

            let studentId = input.studentId

            if (studentId == null){
                const created = await db.insert(users).values({
                    firstName: input.studentfirstName,
                    lastName: input.studentlastName,
                    middleName: input.studentmiddleName,
                    phone: input.studentTelephone,
                    birthDate: input.studentBirthDate,
                    role: "applicant",
                    parentId: context.locals.user.id
                }).returning({id: users.id})

                studentId = created[0].id
            }

            const result = await db.insert(applications).values({
                studentId: studentId,
                userId: context.locals.user.id,
                state: "submitted",
                answers: formFields,
                formId: input.formId
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
            type: z.enum(["number", "date", "text", "file"]),
            regex: z.string(),
            max: z.number(),
            min: z.number(),
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