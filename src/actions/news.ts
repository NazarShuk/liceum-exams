import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { news } from "@db/schema";
import { logEvent } from "@lib/analytics";

export const submitNewsEdit = defineAction({
    accept: "json",
    input: z.object({
        newsId: z.number().int().positive().optional(),
        title: z.string().trim().min(1, "Вкажіть заголовок новини"),
        tag: z.string().trim().min(1, "Вкажіть тег"),
        content: z.string().trim().min(1, "Вкажіть текст новини"),
        pinned: z.boolean().optional(),
        hidden: z.boolean().optional(),
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
                ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
                ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
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

            logEvent({
                type: input.newsId ? "news_update" : "news_create",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "news",
                targetId: newsId,
            });
            return { success: true, newsId };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const updateNewsFlags = defineAction({
    accept: "json",
    input: z.object({
        newsId: z.number().int().positive(),
        pinned: z.boolean().optional(),
        hidden: z.boolean().optional(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }
            if (input.pinned === undefined && input.hidden === undefined) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Немає змін" });
            }

            const db = getDrizzle();
            const existingNews = await db.query.news.findFirst({
                where: { id: input.newsId },
            });
            if (!existingNews) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Новину не знайдено" });
            }

            const changes = {
                ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
                ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
            };
            await db.update(news).set(changes).where(eq(news.id, input.newsId));

            logEvent({
                type: "news_flags_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "news",
                targetId: input.newsId,
                detail: Object.entries(changes)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(","),
            });
            return { success: true };
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
            logEvent({
                type: "news_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "news",
                targetId: input.newsId,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
