import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDrizzle } from "@db/drizzle";
import { fileKeyFor, uploadError } from "@lib/uploads";
import { rateLimit } from "@lib/rate-limit";
import { verifyTurnstile } from "@lib/turnstile";
import { translate } from "@i18n/index";

const fail = (error: string, status: number) => Response.json({ error }, { status });

export const POST = (async ({ request, locals }) => {
    const user = locals.user;
    const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
        translate(locals.locale, key, params);

    if (!user) return fail(t("errors.notAuthorized"), 401);
    if (!(await rateLimit("UPLOAD_LIMITER", `app-upload:${user.id}`))) {
        return fail(t("errors.tooManyUploads"), 429);
    }

    const formData = await request.formData();
    if (user.role !== "admin" && !(await verifyTurnstile(formData.get("cf-turnstile-response"), request))) {
        return fail(t("errors.turnstile"), 403);
    }
    const file = formData.get("file");
    const formId = Number(formData.get("formId"));
    const field = String(formData.get("field") ?? "");

    if (!(file instanceof File)) return fail(t("errors.fileNotSelected"), 400);

    const db = getDrizzle();
    const form = Number.isInteger(formId) ? await db.query.forms.findFirst({ where: { id: formId } }) : undefined;
    const schemaField = form?.schema.find((item) => item.slug === field);
    if (!schemaField || schemaField.type !== "file") return fail(t("errors.fileFieldNotFound"), 400);

    if (user.role === "applicant") {
        // Applicants may only upload while an admin has asked them to fix their application.
        const editable = await db.query.applications.findFirst({
            where: {
                OR: [{ studentId: user.id }, { userId: user.id }],
                formId,
                state: "submitted",
                status: "attention",
            },
            columns: { id: true },
        });
        if (!editable) return fail(t("errors.applicantsCannotCreate"), 403);
    }

    const error = uploadError(file);
    if (error) return fail(t(error.key, "size" in error ? { size: error.size } : undefined), 400);

    const key = fileKeyFor(user.id, field);
    await env.FILE_BUCKET.put(key, await file.arrayBuffer(), {
        customMetadata: {
            owner: user.id.toString(),
            fileName: file.name,
            fileType: file.type,
        },
    });

    return Response.json({ key });
}) satisfies APIRoute;
