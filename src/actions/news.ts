import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { news } from "@db/schema";

export const submitNewsEdit = defineAction({
    accept: "json",
    input: z.object({
        newsId: z.number().int().positive().optional(),
        title: z.string().trim().min(1, "Вкажіть заголовок новини"),
        tag: z.string().trim().min(1, "Вкажіть тег"),
        content: z.string().trim().min(1, "Вкажіть текст новини"),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const values = {
                title: input.title,
                tag: input.tag,
                content: input.content,
            };

            let newsId = input.newsId;
            if (newsId) {
                const existingNews = await db.query.news.findFirst({
                    where: { id: newsId },
                });
                if (!existingNews) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Новину не знайдено" });
                }
                await db.update(news).set(values).where(eq(news.id, newsId));
            } else {
                const [createdNews] = await db.insert(news).values(values).returning({ id: news.id });
                newsId = createdNews.id;
            }

            return { success: true, newsId };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteNews = defineAction({
    accept: "json",
    input: z.object({
        newsId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingNews = await db.query.news.findFirst({
                where: { id: input.newsId },
            });
            if (!existingNews) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Новину не знайдено" });
            }

            await db.delete(news).where(eq(news.id, input.newsId));
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
