// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { jwtVerify } from "jose";
import { getDrizzle } from "./db/drizzle";
import { logErrorEvent } from "./lib/analytics";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    LOCALE_COOKIE_MAX_AGE,
    type Locale,
    isLocale,
    isLocalizablePath,
    localizePath,
    localeFromPath,
} from "./i18n/config";

// Same runtime secret `generateToken` signs with; import.meta.env is baked in at build time.
const secret = new TextEncoder().encode(env.JWT_SECRET);

const localeCookie = {
    // The locale is not sensitive; the offline fallback reads it from document.cookie.
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
};

function isLocalizable(pathname: string): boolean {
    return isLocalizablePath(pathname);
}

function prefersEnglish(request: Request): boolean {
    const header = request.headers.get("accept-language") ?? "";
    const first = header.split(",")[0]?.trim().toLowerCase();
    return !!first?.startsWith("en");
}

function acceptsHtml(request: Request): boolean {
    if (request.method !== "GET") return false;
    return request.headers.get("accept")?.includes("text/html") ?? false;
}

function withVary(response: Response): Response {
    if (!response.headers.get("vary")?.includes("Accept-Language")) {
        response.headers.append("Vary", "Cookie, Accept-Language");
    }
    return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
    const pathname = context.url.pathname;
    const pathnameLocale = localeFromPath(pathname);
    const cookieLocale = context.cookies.get(LOCALE_COOKIE)?.value;
    const storedLocale: Locale | null = isLocale(cookieLocale) ? cookieLocale : null;

    let locale: Locale = pathnameLocale ?? storedLocale ?? DEFAULT_LOCALE;
    const localizable = isLocalizable(pathname);

    // `/uk/*` is not a canonical URL; keep Ukrainian at the root.
    if (pathnameLocale === "uk" && localizable) {
        context.cookies.set(LOCALE_COOKIE, "uk", localeCookie);
        const target = pathname === "/uk" ? "/" : pathname.slice(3);
        return withVary(context.redirect(target + context.url.search, 301));
    }

    // First visit from an English browser: send it to the English version once.
    // An explicit locale cookie always wins, so a user can choose Ukrainian.
    if (
        localizable &&
        acceptsHtml(context.request) &&
        !pathnameLocale &&
        !storedLocale &&
        prefersEnglish(context.request)
    ) {
        context.cookies.set(LOCALE_COOKIE, "en", localeCookie);
        return withVary(context.redirect(localizePath("en", pathname) + context.url.search, 302));
    }

    // Keep an explicit English preference on unprefixed page URLs.
    if (localizable && acceptsHtml(context.request) && storedLocale === "en" && !pathnameLocale) {
        return withVary(context.redirect(localizePath("en", pathname) + context.url.search, 302));
    }

    context.locals.locale = locale;

    // Astro actions and API routes do not carry the `/en` prefix; resolve their
    // locale from the cookie (set when a page was rendered) or the referer.
    if (!localizable && !pathnameLocale) {
        const referer = context.request.headers.get("referer");
        if (referer) {
            try {
                const refererLocale = localeFromPath(new URL(referer).pathname);
                if (refererLocale) context.locals.locale = refererLocale;
            } catch {
                // malformed referer, keep the cookie/default locale
            }
        }
    }

    if (!context.locals.locale) context.locals.locale = locale;

    if (localizable || pathnameLocale === "en") {
        context.cookies.set(LOCALE_COOKIE, context.locals.locale, localeCookie);
    }

    const requestPath = pathnameLocale ? (pathname === "/en" ? "/" : pathname.slice(3)) : pathname;

    const token = context.cookies.get("session")?.value;

    if (token) {
        try {
            const { payload } = await jwtVerify(token, secret);
            const db = getDrizzle();
            const user = await db.query.users.findFirst({ where: { id: parseInt(payload.sub || "-1") } });
            if (!user) {
                context.cookies.delete("session");
                logErrorEvent({ source: "server", type: "auth_session_invalid_user", path: requestPath });
                return withVary(context.redirect(localizePath(context.locals.locale, "/"), 302));
            }
            context.locals.user = user;
        } catch {
            context.cookies.delete("session");
            logErrorEvent({ source: "server", type: "auth_session_invalid_token", path: requestPath });
        }
    }

    if (requestPath.startsWith("/cabinet") && !context.locals.user) {
        logErrorEvent({ source: "server", type: "authz_cabinet_unauthorized", path: requestPath });
        return withVary(context.redirect(localizePath(context.locals.locale, "/"), 302));
    }
    if (requestPath.startsWith("/admin")) {
        if (!context.locals.user) {
            logErrorEvent({ source: "server", type: "authz_admin_unauthorized", path: requestPath });
            return withVary(context.redirect(localizePath(context.locals.locale, "/"), 302));
        }
        const role = context.locals.user.role;
        const allowed = role === "admin" || (role === "teacher" && requestPath.startsWith("/admin/groups"));
        if (!allowed) {
            logErrorEvent({
                source: "server",
                type: "authz_admin_forbidden",
                path: requestPath,
                userId: context.locals.user?.id,
            });
            return withVary(context.redirect(localizePath(context.locals.locale, "/cabinet"), 302));
        }
    }

    try {
        // Render `/en/...` with the same page files by rewriting to the unprefixed route.
        if (pathnameLocale === "en" && localizable) {
            const response = await next(new URL(requestPath + context.url.search, context.url.origin));
            return withVary(response);
        }

        // Only HTML pages depend on the locale cookie; keep static assets and APIs cacheable.
        return localizable ? withVary(await next()) : await next();
    } catch (e) {
        logErrorEvent({
            source: "server",
            type: "middleware_exception",
            path: requestPath,
            userId: context.locals.user?.id,
            message: e instanceof Error ? e.message : String(e),
        });
        throw e;
    }
});
