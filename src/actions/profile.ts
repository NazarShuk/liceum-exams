import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { applications, campaignsToProfiles, profiles } from "@db/schema";
import { deleteFormIfUnused } from "@lib/forms";
import { logEvent } from "@lib/analytics";

export const submitProfileEdit = defineAction({
    accept: "json",
    input: z.object({
        profileId: z.number().int().positive().optional(),
        campaignId: z.number().int().positive().optional(),
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
            let previousFormId: number | null = null;

            if (profileId) {
                const existingProfile = await db.query.profiles.findFirst({
                    where: { id: profileId },
                });
                if (!existingProfile) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Профіль не знайдено" });
                }
                previousFormId = existingProfile.formId;
                await db.update(profiles).set(values).where(eq(profiles.id, profileId));
            } else {
                if (!input.campaignId) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Спочатку збережіть кампанію" });
                }
                const campaign = await db.query.campaigns.findFirst({
                    where: { id: input.campaignId },
                });
                if (!campaign) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" });
                }

                const [createdProfile] = await db.insert(profiles).values(values).returning({ id: profiles.id });
                profileId = createdProfile.id;

                try {
                    await db.insert(campaignsToProfiles).values({
                        campaignId: input.campaignId,
                        profileId,
                    });
                } catch (error) {
                    // Never leave a profile without its campaign.
                    await db.delete(profiles).where(eq(profiles.id, profileId));
                    throw error;
                }
            }

            if (previousFormId && previousFormId !== input.formId) {
                await deleteFormIfUnused(db, previousFormId);
            }

            logEvent({
                type: input.profileId ? "profile_update" : "profile_create",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "profiles",
                targetId: profileId,
            });
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

            // applications.profile_id cascades, so a submitted application would be erased with it.
            const submittedCount = await db.$count(
                applications,
                and(eq(applications.profileId, input.profileId), eq(applications.state, "submitted")),
            );
            if (submittedCount > 0) {
                throw new ActionError({ code: "BAD_REQUEST", message: "За цим профілем уже є подані заяви" });
            }

            await db.delete(profiles).where(eq(profiles.id, input.profileId));
            if (existingProfile.formId) {
                await deleteFormIfUnused(db, existingProfile.formId);
            }
            logEvent({
                type: "profile_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "profiles",
                targetId: input.profileId,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
