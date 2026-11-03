import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { uploadError } from "@lib/uploads";

const fail = (error: string, status: number) => Response.json({ error }, { status });
const keyPattern = /^news\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const POST = (async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail("Потрібно увійти в акаунт", 401);
    if (user.role !== "admin") return fail("Лише адміністратори можуть додавати файли", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("Файл не вибрано", 400);

    const error = uploadError(file);
    if (error) return fail(error, 400);

    const key = `news/${user.id}/${crypto.randomUUID()}`;
    await env.FILE_BUCKET.put(key, await file.arrayBuffer(), {
        customMetadata: {
            owner: user.id.toString(),
            fileName: file.name,
            fileType: file.type,
        },
    });

    return Response.json({ url: `/api/news-attachment?key=${encodeURIComponent(key)}` });
}) satisfies APIRoute;

export const GET = (async ({ url }) => {
    const key = url.searchParams.get("key") ?? "";
    if (!keyPattern.test(key)) return new Response(null, { status: 404 });

    const file = await env.FILE_BUCKET.get(key);
    if (!file) return new Response(null, { status: 404 });

    const fileName = file.customMetadata?.fileName || "attachment";
    const encodedFileName = encodeURIComponent(fileName).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return new Response(await file.arrayBuffer(), {
        headers: {
            "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`,
            "Content-Type": file.customMetadata?.fileType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    });
}) satisfies APIRoute;
