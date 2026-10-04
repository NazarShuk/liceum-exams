import { defineAction } from "astro:actions";
import { SignJWT } from "jose";
import { env } from "cloudflare:workers";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function generateToken(id: number, firstName: string, lastName: string){
    return await new SignJWT({sub: id.toString(), firstName: firstName, lastName: lastName})
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(secret);
}

export const logout = defineAction({
    accept: "form",
    handler: async (data, context) => {
        console.log("logout")
        context.cookies.delete("session", {path: "/"})
        return {success: true}
    }
})