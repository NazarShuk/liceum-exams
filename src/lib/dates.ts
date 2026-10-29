/**
 * SQLite `CURRENT_TIMESTAMP` is UTC but has no zone marker, so `new Date(...)` would
 * read it as local time and shift every displayed date by the timezone offset.
 */
export function parseDbDate(value: string | Date): Date {
    if (value instanceof Date) return value;
    const iso = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
    return new Date(iso);
}

/** Current UTC time in the exact "YYYY-MM-DD HH:MM:SS" layout SQLite writes. */
export function dbTimestamp(date = new Date()): string {
    return date.toISOString().slice(0, 19).replace("T", " ");
}
