// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';
import { getDrizzle } from './db/drizzle';
import { logErrorEvent } from './lib/analytics';

const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET);

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get('session')?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const db = getDrizzle()
      const user = await db.query.users.findFirst({where:{id:parseInt(payload.sub || "-1")}})
      if (!user){
        context.cookies.delete('session');
        try { logErrorEvent({ source: "server", type: "auth_session_invalid_user", path: context.url.pathname }); } catch {}
        return context.redirect('/');
      }
      context.locals.user = user
    } catch {
      context.cookies.delete('session');
      try { logErrorEvent({ source: "server", type: "auth_session_invalid_token", path: context.url.pathname }); } catch {}
    }
  }

  if (context.url.pathname.startsWith('/cabinet') && !context.locals.user) {
    try { logErrorEvent({ source: "server", type: "authz_cabinet_unauthorized", path: context.url.pathname }); } catch {}
    return context.redirect('/');
  }
  if (context.url.pathname.startsWith("/admin")) {
    if (!context.locals.user) {
      try { logErrorEvent({ source: "server", type: "authz_admin_unauthorized", path: context.url.pathname }); } catch {}
      return context.redirect("/");
    }
    if (context.locals.user.role !== "admin") {
      try { logErrorEvent({ source: "server", type: "authz_admin_forbidden", path: context.url.pathname, userId: context.locals.user?.id }); } catch {}
      return context.redirect("/cabinet");
    }
  }

  try {
    return await next();
  } catch (e) {
    try { logErrorEvent({ source: "server", type: "middleware_exception", path: context.url.pathname, userId: context.locals.user?.id, message: e instanceof Error ? e.message : String(e) }); } catch {}
    throw e;
  }
});