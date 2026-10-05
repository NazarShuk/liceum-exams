// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';
import { getDrizzle } from './db/drizzle';

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
        return context.redirect('/');
      }
      context.locals.user = user
    } catch {
      context.cookies.delete('session');
    }
  }

  if (context.url.pathname.startsWith('/cabinet') && !context.locals.user) {
    return context.redirect('/');
  }

  return next();
});