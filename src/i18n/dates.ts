import { format, formatRelative } from "date-fns";
import { enGB, uk } from "date-fns/locale";
import { type Locale, localeTag } from "./config";

const DATE_LOCALES = { uk, en: enGB } as const;

export function dateLocale(locale: Locale) {
    return DATE_LOCALES[locale];
}

export function formatDate(date: Date, locale: Locale, pattern = "d MMMM yyyy"): string {
    return format(date, pattern, { locale: dateLocale(locale) });
}

export function formatDateLong(date: Date, locale: Locale): string {
    return format(date, "PPP", { locale: dateLocale(locale) });
}

export function formatRelativeDate(date: Date, locale: Locale, base = new Date()): string {
    return formatRelative(date, base, { locale: dateLocale(locale) });
}

export function formatNumericDate(value: Date | string, locale: Locale): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString(localeTag(locale));
}

export function compareText(a: string, b: string, locale: Locale): number {
    return a.localeCompare(b, localeTag(locale), { numeric: true, sensitivity: "base" });
}
