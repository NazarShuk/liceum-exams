import type { APIRoute } from "astro";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, localizePath } from "@i18n/config";

const localeCookie = {
    // The locale is not sensitive; the offline fallback reads it from document.cookie.
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
};

function safeNext(value: string | null): string {
    if (!value) return "/";
    try {
        const url = new URL(value, "https://locale.invalid");
        if (url.origin !== "https://locale.invalid") return "/";
        return url.pathname + url.search + url.hash;
    } catch {
        return "/";
    }
}

export const GET: APIRoute = (context) => {
    const requested = context.url.searchParams.get("lang");
    const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
    const next = safeNext(context.url.searchParams.get("next"));

    context.cookies.set(LOCALE_COOKIE, locale, localeCookie);
    return context.redirect(localizePath(locale, next), 303);
};
