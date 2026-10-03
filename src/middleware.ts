// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET);

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get('session')?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      context.locals.user = {
        sub: parseInt(payload.sub || ""),
        firstName: payload.firstName as string,
        lastName: payload.lastName as string
      }
    } catch {
      context.cookies.delete('session');
    }
  }

  if (context.url.pathname.startsWith('/cabinet') && !context.locals.user) {
    return context.redirect('/');
  }

  return next();
});