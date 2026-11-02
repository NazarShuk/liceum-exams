import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDrizzle } from "@db/drizzle";
import { fileKeyFor, uploadError } from "@lib/uploads";

const fail = (error: string, status: number) => Response.json({ error }, { status });

export const POST = (async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail("Потрібно увійти в акаунт", 401);
    if (user.role === "applicant") return fail("Абітурієнти не можуть створювати заяви", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    const formId = Number(formData.get("formId"));
    const field = String(formData.get("field") ?? "");

    if (!(file instanceof File)) return fail("Файл не вибрано", 400);

    const form = Number.isInteger(formId)
        ? await getDrizzle().query.forms.findFirst({ where: { id: formId } })
        : undefined;
    const schemaField = form?.schema.find((item) => item.slug === field);
    if (!schemaField || schemaField.type !== "file") return fail("Поле для файлу не знайдено", 400);

    const error = uploadError(file);
    if (error) return fail(error, 400);

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
