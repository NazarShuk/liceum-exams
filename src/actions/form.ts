import { ActionError, defineAction } from "astro:actions";
import {z} from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "../db/drizzle";
import { applications, users } from "../db/schema";

const birthDate = z.string().min(1, "Вкажіть дату народження").pipe(z.coerce.date());

export const submitForm = defineAction({
    accept: "form",
    input: z.object({

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
            if (!context.locals.user) throw new ActionError({code: "UNAUTHORIZED"})

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
                userId: context.locals.user.id
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
