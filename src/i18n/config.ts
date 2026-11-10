export const LOCALES = ["uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";

export const LOCALE_COOKIE = "locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function otherLocale(locale: Locale): Locale {
    return locale === "uk" ? "en" : "uk";
}

function splitPath(path: string): [string, string] {
    const index = path.search(/[?#]/);
    return index === -1 ? [path, ""] : [path.slice(0, index), path.slice(index)];
}

/** `/en/news?x=1` -> `/news?x=1`, `/uk/news` -> `/news`, `/news` -> `/news`. */
export function stripLocale(path: string): string {
    const [pathname, suffix] = splitPath(path);
    let stripped = pathname;

    if (stripped === "/en" || stripped === "/uk") {
        stripped = "/";
    } else if (stripped.startsWith("/en/")) {
        stripped = stripped.slice(3);
    } else if (stripped.startsWith("/uk/")) {
        stripped = stripped.slice(3);
    }

    return (stripped || "/") + suffix;
}

/** Locale explicitly encoded in the pathname, if any. */
export function localeFromPath(path: string): Locale | null {
    const [pathname] = splitPath(path);
    if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
    if (pathname === "/uk" || pathname.startsWith("/uk/")) return "uk";
    return null;
}

/** Removes a trailing slash (except on the root) while keeping the query and hash. */
export function normalizePath(path: string): string {
    const [pathname, suffix] = splitPath(path);
    const normalized = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
    return (normalized || "/") + suffix;
}

export function isExternalPath(path: string): boolean {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path);
}

const NON_LOCALIZABLE_PREFIXES = [
    "/api",
    "/_actions",
    "/_image",
    "/_server-islands",
    "/file",
    "/sw.js",
    "/manifest.webmanifest",
    "/robots.txt",
    "/favicon",
    "/pwa-",
    "/apple-touch-icon",
    "/offline.html",
];

/** API routes, static files, and service-worker assets are never locale-scoped. */
export function isLocalizablePath(path: string): boolean {
    const [pathname] = splitPath(stripLocale(path));
    const bare = pathname || "/";
    if (NON_LOCALIZABLE_PREFIXES.some((prefix) => bare === prefix || bare.startsWith(`${prefix}/`))) return false;
    return !/\.[a-z0-9]+$/i.test(bare);
}

/** Prefixes an internal path for a locale. Keeps query strings and hashes. */
export function localizePath(locale: Locale, path: string): string {
    if (!path) return locale === "en" ? "/en" : "/";
    if (isExternalPath(path)) return path;

    const [pathname, suffix] = splitPath(path);
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const [base] = splitPath(stripLocale(normalized));

    // Never add a locale prefix to API or static asset URLs.
    if (!isLocalizablePath(base)) return path;

    if (locale === "en") {
        return `/en${base === "/" ? "" : base}${suffix}`;
    }
    return `${base}${suffix}`;
}

export function localePath(locale: Locale) {
    return (path: string) => localizePath(locale, path);
}

export function localeTag(locale: Locale): string {
    return locale === "en" ? "en-GB" : "uk-UA";
}
