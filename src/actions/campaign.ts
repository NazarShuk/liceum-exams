import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, inArray } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { campaigns, campaignsToProfiles, applications, profiles } from "@db/schema";
import { deleteFormIfUnused } from "@lib/forms";
import { logEvent } from "@lib/analytics";

const dateInput = z.string().refine((value) => {
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Некоректна дата");

export const submitCampaignEdit = defineAction({
    accept: "json",
    input: z.object({
        campaignId: z.number().int().positive().optional(),
        title: z.string().trim().min(1, "Вкажіть назву кампанії"),
        beginsAt: dateInput,
        endsAt: dateInput,
        profileIds: z.array(z.number().int().positive()),
        allowMultipleProfiles: z.boolean()
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const profileIds = [...new Set(input.profileIds)];
            const existingProfiles = profileIds.length
                ? await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, profileIds))
                : [];

            if (existingProfiles.length !== profileIds.length) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Один або кілька профілів не знайдені" });
            }

            const values = {
                title: input.title,
                beginsAt: input.beginsAt ? new Date(`${input.beginsAt}T00:00:00.000Z`) : null,
                endsAt: input.endsAt ? new Date(`${input.endsAt}T00:00:00.000Z`) : null,
                allowMultipleProfiles: input.allowMultipleProfiles
            };

            let campaignId = input.campaignId;
            if (campaignId) {
                const existingCampaign = await db.query.campaigns.findFirst({
                    where: { id: campaignId },
                });
                if (!existingCampaign) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" });
                }
                await db.update(campaigns).set(values).where(eq(campaigns.id, campaignId));
            } else {
                const [createdCampaign] = await db.insert(campaigns).values(values).returning({ id: campaigns.id });
                campaignId = createdCampaign.id;
            }

            const currentAssignments = await db
                .select({ profileId: campaignsToProfiles.profileId })
                .from(campaignsToProfiles)
                .where(eq(campaignsToProfiles.campaignId, campaignId));
            const currentProfileIds = currentAssignments.map(({ profileId }) => profileId);
            const removedProfileIds = currentProfileIds.filter((id) => !profileIds.includes(id));
            const addedProfileIds = profileIds.filter((id) => !currentProfileIds.includes(id));

            if (removedProfileIds.length) {
                await db.delete(campaignsToProfiles).where(and(
                    eq(campaignsToProfiles.campaignId, campaignId),
                    inArray(campaignsToProfiles.profileId, removedProfileIds),
                ));

                for (const profileId of removedProfileIds) {
                    // Keep profiles that have applications as history; drop the rest so they do not float around.
                    const applicationCount = await db.$count(applications, eq(applications.profileId, profileId));
                    if (applicationCount > 0) continue;

                    const removedProfile = await db.query.profiles.findFirst({ where: { id: profileId } });
                    await db.delete(profiles).where(eq(profiles.id, profileId));
                    if (removedProfile?.formId) {
                        await deleteFormIfUnused(db, removedProfile.formId);
                    }
                }
            }
            if (addedProfileIds.length) {
                for (const profileId of addedProfileIds) {
                    const existingAssignment = await db.query.campaignsToProfiles.findFirst({
                        where: { profileId: profileId }
                    })
                    if (existingAssignment) {
                        throw new ActionError({ code: "BAD_REQUEST", message: "Профіль уже належить до іншої кампанії" })
                    }
                    await db.insert(campaignsToProfiles).values({ campaignId, profileId })
                }
            }

            logEvent({
                type: input.campaignId ? "campaign_update" : "campaign_create",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "campaigns",
                targetId: campaignId,
            });
            return { success: true, campaignId };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteCampaign = defineAction({
    accept: "json",
    input: z.object({
        campaignId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingCampaign = await db.query.campaigns.findFirst({
                where: { id: input.campaignId },
            });
            if (!existingCampaign) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Кампанію не знайдено" });
            }

            await db.delete(campaigns).where(eq(campaigns.id, input.campaignId));
            logEvent({
                type: "campaign_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "campaigns",
                targetId: input.campaignId,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
