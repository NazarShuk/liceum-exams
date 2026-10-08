import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { forms, profiles } from "@db/schema";

export const submitProfileEdit = defineAction({
    accept: "json",
    input: z.object({
        profileId: z.number().int().positive().optional(),
        title: z.string().trim().min(1, "Вкажіть назву профілю"),
        description: z.string(),
        formId: z.number().int().positive().nullable(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            if (input.formId !== null) {
                const form = await db.query.forms.findFirst({ where: { id: input.formId } });
                if (!form) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Форму не знайдено" });
                }
            }

            const values = {
                title: input.title,
                description: input.description || null,
                formId: input.formId,
            };

            let profileId = input.profileId;
            if (profileId) {
                const existingProfile = await db.query.profiles.findFirst({
                    where: { id: profileId },
                });
                if (!existingProfile) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Профіль не знайдено" });
                }
                await db.update(profiles).set(values).where(eq(profiles.id, profileId));
            } else {
                const [createdProfile] = await db.insert(profiles).values(values).returning({ id: profiles.id });
                profileId = createdProfile.id;
            }

            return { success: true, profileId };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteProfile = defineAction({
    accept: "json",
    input: z.object({
        profileId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingProfile = await db.query.profiles.findFirst({
                where: { id: input.profileId },
            });
            if (!existingProfile) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Профіль не знайдено" });
            }

            await db.delete(profiles).where(eq(profiles.id, input.profileId));
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
