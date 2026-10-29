export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Returns a user-facing reason the file cannot be stored, or null when it is fine. */
export function uploadError(file: File): string | null {
    if (file.size > MAX_UPLOAD_BYTES) return `файл завеликий (максимум ${MAX_UPLOAD_BYTES / 1024 / 1024} МБ)`;
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return "непідтримуваний тип файлу (PDF, JPG, PNG, WEBP)";
    return null;
}
