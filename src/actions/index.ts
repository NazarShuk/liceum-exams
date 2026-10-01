import { defineAction } from "astro:actions";
import {z} from "astro/zod";
import { SignJWT } from "jose";
import { getPrisma } from "../utils/prisma";

const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET);

export const server = {
    login: defineAction({
        accept: "form",
        input: z.object({
            firstName: z.string(),
            lastName: z.string(),
            telephone: z.string()
        }),
        handler: async (input, context)=> {
            const prisma = getPrisma()

            const users = await prisma.user.findMany({
                where: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    phone: input.telephone
                },
                take: 1
            })
            let user = users[0]

            if (!user){
                user = await prisma.user.create({
                    data: {
                        firstName: input.firstName,
                        lastName: input.lastName,
                        phone: input.telephone
                    }
                })
            }
            console.log(user)

            const token = await new SignJWT({sub: user.id, firstName: user.firstName, lastName: user.lastName})
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
    }),
    logout: defineAction({
        accept: "form",
        handler: async (data, context) => {
            console.log("logout")
            context.cookies.delete("session", {path: "/"})
            return {success: true}
        }
    })
}