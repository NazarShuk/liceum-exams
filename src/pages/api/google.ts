import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDrizzle } from "@db/drizzle";
import { generateToken } from "@actions/auth";
import { applicantInvites, users } from "@db/schema";
import {eq} from "drizzle-orm"
import { logErrorEvent } from "@lib/analytics";

export const GET = (async (context) => {
    const code = context.url.searchParams.get("code") || ""
    if (!code) {
        logErrorEvent({ source: "server", type: "auth_google_missing_code", path: context.url.pathname });
        return new Response(null, {status: 400})
    }

    try{
        const result = await fetch(`
        https://oauth2.googleapis.com/token?client_id=${env.GOOGLE_CLIENT_ID}&client_secret=${env.GOOGLE_CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${context.url.origin}/api/google`,
        {method: "POST"})

        const data = await result.json() as {access_token: string, expires_in: number, scope: string, token_type: string, id_token: string}
        
        if (!result.ok){
            console.error(data)
            logErrorEvent({ source: "server", type: "auth_google_token_failed", path: context.url.pathname, status: String(result.status) });
            return new Response(null, {status: 500})
        }

        const userResult = await fetch(`https://openidconnect.googleapis.com/v1/userinfo`, {
            headers: {
                "Authorization": `Bearer ${data.access_token}`
            }
        })
        if (!userResult.ok){
            logErrorEvent({ source: "server", type: "auth_google_userinfo_failed", path: context.url.pathname, status: String(userResult.status) });
            return new Response(null, {status: 500})
        }
        const userdata = await userResult.json() as {sub: string, name: String, given_name: string, family_name: string, picture: string, email:string, email_verified: boolean}

        const state = context.url.searchParams.get("state")?.split("=")
        const inviteId = state ? state[0] === "inviteId" ? state[1] : undefined : undefined

        const db = getDrizzle()
        const account = await db.query.users.findFirst({where: {externalId: userdata.sub}})
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
            if  (inviteId){
                const application = await db.query.applicantInvites.findFirst({
                    where: {
                        id: inviteId
                    },
                    with: {
                        application: {
                            columns: {
                                studentId: true,
                                userId: true
                            }
                        }
                    }
                })
                if (application){
                    const user = await db.update(users).set({
                        externalId: userdata.sub
                    }).where(eq(users.id, application.application?.studentId || -1)).returning({id: users.id, firstName: users.firstName, lastName: users.lastName})

                    await db.delete(applicantInvites).where(eq(applicantInvites.id, inviteId))

                    const token = await generateToken(user[0].id, user[0].firstName, user[0].lastName)
    
                    context.cookies.set("session", token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 60 * 60 * 24 * 7,
                    })
                }
                else {
                    logErrorEvent({ source: "server", type: "auth_google_invite_not_found", path: context.url.pathname });
                    return new Response(null, {status: 404})
                }
            }
            else{
                const newAccount = await db.insert(users).values({
                    externalId: userdata.sub,
                    firstName: userdata.given_name,
                    lastName: userdata.family_name || "",
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
        
    }
    catch(e){
        console.error(e)
        logErrorEvent({ source: "server", type: "auth_google_exception", path: context.url.pathname, message: e instanceof Error ? e.message : String(e) });
        return new Response(null, {status: 500})
    }


    return context.redirect("/cabinet", 307)
    
}) satisfies APIRoute;