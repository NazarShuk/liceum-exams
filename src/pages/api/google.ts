import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDrizzle } from "../../db/drizzle";
import { generateToken } from "../../actions/auth";
import { users } from "../../db/schema";

export const GET = (async (context) => {
    const code = context.url.searchParams.get("code") || ""
    if (!code) 
        return new Response(null, {status: 400})

    try{
        const result = await fetch(`
        https://oauth2.googleapis.com/token?client_id=${env.GOOGLE_CLIENT_ID}&client_secret=${env.GOOGLE_CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=http://localhost:4321/api/google`,
        {method: "POST"})

        const data = await result.json() as {access_token: string, expires_in: number, scope: string, token_type: string, id_token: string}
        
        if (!result.ok){
            console.error(data)
            return new Response(null, {status: 500})
        }

        const userResult = await fetch(`https://openidconnect.googleapis.com/v1/userinfo`, {
            headers: {
                "Authorization": `Bearer ${data.access_token}`
            }
        })
        if (!userResult.ok){
            return new Response(null, {status: 500})
        }
        const userdata = await userResult.json() as {sub: string, name: String, given_name: string, family_name: string, picture: string, email:string, email_verified: boolean}
        console.log(userdata)

        const db = getDrizzle()
        const account = await db.query.users.findFirst({where: {externalId: parseInt(userdata.sub)}})
        if (account){
            const token = await generateToken(account.id, account.firstName, account.lastName)

            context.cookies.set("session", token, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            })
        }
        else{
            const newAccount = await db.insert(users).values({
                externalId: parseInt(userdata.sub),
                firstName: userdata.given_name,
                lastName: userdata.family_name,
            }).returning({id: users.id, firstName: users.firstName, lastName: users.lastName})

            const token = await generateToken(newAccount[0].id, newAccount[0].firstName, newAccount[0].lastName)

            context.cookies.set("session", token, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            })
        }
        
    }
    catch(e){
        console.error(e)
        return new Response(null, {status: 500})
    }


    return context.redirect("/cabinet", 307)
    
}) satisfies APIRoute;