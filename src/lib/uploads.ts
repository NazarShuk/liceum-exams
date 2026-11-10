export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export type UploadError = { key: "upload.tooLarge"; size: number } | { key: "upload.badType" };

/** Returns a translation key and its params for a file that cannot be stored, or null when it is fine. */
export function uploadError(file: File): UploadError | null {
    if (file.size > MAX_UPLOAD_BYTES) return { key: "upload.tooLarge", size: MAX_UPLOAD_MB };
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return { key: "upload.badType" };
    return null;
}

/** R2 keys stored in a saved application's answers. */
export function answerFileKeys(answers: Record<string, unknown>): string[] {
    return Object.values(answers).flatMap((answer) => {
        if (typeof answer !== "object" || answer === null || !("key" in answer)) return [];
        const key = (answer as { key?: unknown }).key;
        return typeof key === "string" && key.startsWith("applications/") ? [key] : [];
    });
}

/** R2 key for a file uploaded by `userId` for the form field `field`. */
export function fileKeyFor(userId: number, field: string) {
    return `applications/${userId}/${crypto.randomUUID()}/${encodeURIComponent(field)}`;
}

/** True when `key` is a well-formed key this user could have uploaded for this field. */
export function isFileKey(key: unknown, userId: number, field: string): key is string {
    if (typeof key !== "string") return false;
    const prefix = `applications/${userId}/`;
    const suffix = `/${encodeURIComponent(field)}`;
    if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key.slice(prefix.length, -suffix.length),
    );
}
