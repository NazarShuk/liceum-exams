import type { Locale } from "@i18n/config";
import { compareText, formatNumericDate } from "@i18n/dates";

export function formatCellValue(value: unknown, locale: Locale): string {
    if (value == null) return "";
    if (value instanceof Date) return formatNumericDate(value, locale);
    if (Array.isArray(value)) return value.map((item) => formatCellValue(item, locale)).join(", ");
    return String(value);
}

export function compareCellValues(a: unknown, b: unknown, locale: Locale): number {
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === "number" && typeof b === "number") return a - b;
    return compareText(formatCellValue(a, locale), formatCellValue(b, locale), locale);
}
