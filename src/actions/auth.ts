import { defineAction } from "astro:actions";
import {z} from "astro/zod";
import { SignJWT } from "jose";
import { getDrizzle } from "../db/drizzle";
import { users } from "../db/schema";
import { and, eq } from "drizzle-orm";
const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET);

export const login = defineAction({
    accept: "form",
    input: z.object({
        firstName: z.string().nonempty(),
        lastName: z.string().nonempty(),
        telephone: z.string().nonempty()
    }),
    handler: async (input, context)=> {
        const db = getDrizzle()
        const foundUsers = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName
        }).from(users).where(and(
            eq(users.firstName, input.firstName),
            eq(users.lastName, input.lastName),
            eq(users.phone, input.telephone))
        )
        let user = foundUsers[0]
        if (!user){
            const result = await db.insert(users).values({
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.telephone
            }).returning({id: users.id, firstName: users.firstName, lastName: users.lastName})
            user = result[0]
        }
        console.log(user)
        const token = await new SignJWT({sub: user.id.toString(), firstName: user.firstName, lastName: user.lastName})
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(secret);
        
        context.cookies.set('session', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        })
        console.log(token)
        return {success: true}
    }
})

export const logout = defineAction({
    accept: "form",
    handler: async (data, context) => {
        console.log("logout")
        context.cookies.delete("session", {path: "/"})
        return {success: true}
    }
})