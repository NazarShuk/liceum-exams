export function formatCellValue(value: unknown): string {
    if (value == null) return "";
    if (value instanceof Date) return value.toLocaleDateString("uk-UA");
    if (Array.isArray(value)) return value.map(formatCellValue).join(", ");
    return String(value);
}

export function compareCellValues(a: unknown, b: unknown): number {
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === "number" && typeof b === "number") return a - b;
    return formatCellValue(a).localeCompare(formatCellValue(b), "uk", { numeric: true, sensitivity: "base" });
}
