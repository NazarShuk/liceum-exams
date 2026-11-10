import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, inArray } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { applications, groups, groupsToApplications, groupsToTeachers, users } from "@db/schema";
import { logEvent } from "@lib/analytics";

async function validateTeacherIds(db: ReturnType<typeof getDrizzle>, teacherIds: number[]) {
    if (teacherIds.length === 0) return;
    const existingTeachers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, teacherIds), eq(users.role, "teacher")));
    if (existingTeachers.length !== teacherIds.length) {
        throw new ActionError({ code: "BAD_REQUEST", message: "errors.teachersNotFound" });
    }
}

export const createGroup = defineAction({
    accept: "json",
    input: z.object({
        title: z.string().trim().min(1, "errors.groupTitleRequired"),
        applicationIds: z.array(z.number().int().positive()).min(1, "errors.selectOneApplication"),
        teacherIds: z.array(z.number().int().positive()).default([]),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const applicationIds = [...new Set(input.applicationIds)];
            const teacherIds = [...new Set(input.teacherIds)];

            const existingApplications = await db
                .select({ id: applications.id })
                .from(applications)
                .where(inArray(applications.id, applicationIds));
            if (existingApplications.length !== applicationIds.length) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.someApplicationsNotFound" });
            }
            await validateTeacherIds(db, teacherIds);

            const [group] = await db.insert(groups).values({ title: input.title }).returning({ id: groups.id });

            await db
                .insert(groupsToApplications)
                .values(applicationIds.map((applicationId) => ({ groupId: group.id, applicationId })));
            if (teacherIds.length) {
                await db
                    .insert(groupsToTeachers)
                    .values(teacherIds.map((teacherId) => ({ groupId: group.id, teacherId })));
            }

            logEvent({
                type: "group_create",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "groups",
                targetId: group.id,
                detail: `applications:${applicationIds.length},teachers:${teacherIds.length}`,
            });
            return { success: true, groupId: group.id };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const submitGroupEdit = defineAction({
    accept: "json",
    input: z.object({
        groupId: z.number().int().positive(),
        title: z.string().trim().min(1, "errors.groupTitleRequired"),
        teacherIds: z.array(z.number().int().positive()).default([]),
        applicationIds: z.array(z.number().int().positive()).min(1, "errors.selectOneApplication"),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingGroup = await db.query.groups.findFirst({ where: { id: input.groupId } });
            if (!existingGroup) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.groupNotFound" });
            }

            const teacherIds = [...new Set(input.teacherIds)];
            await validateTeacherIds(db, teacherIds);

            const applicationIds = [...new Set(input.applicationIds)];
            const existingApplications = await db
                .select({ id: applications.id })
                .from(applications)
                .where(inArray(applications.id, applicationIds));
            if (existingApplications.length !== applicationIds.length) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.someApplicationsNotFound" });
            }

            await db.update(groups).set({ title: input.title }).where(eq(groups.id, input.groupId));
            await db.delete(groupsToTeachers).where(eq(groupsToTeachers.groupId, input.groupId));
            if (teacherIds.length) {
                await db
                    .insert(groupsToTeachers)
                    .values(teacherIds.map((teacherId) => ({ groupId: input.groupId, teacherId })));
            }
            await db.delete(groupsToApplications).where(eq(groupsToApplications.groupId, input.groupId));
            await db
                .insert(groupsToApplications)
                .values(applicationIds.map((applicationId) => ({ groupId: input.groupId, applicationId })));

            logEvent({
                type: "group_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "groups",
                targetId: input.groupId,
                detail: `applications:${applicationIds.length},teachers:${teacherIds.length}`,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const deleteGroup = defineAction({
    accept: "json",
    input: z.object({
        groupId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingGroup = await db.query.groups.findFirst({ where: { id: input.groupId } });
            if (!existingGroup) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.groupNotFound" });
            }

            await db.delete(groups).where(eq(groups.id, input.groupId));
            logEvent({
                type: "group_delete",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "groups",
                targetId: input.groupId,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const addApplicationsToGroup = defineAction({
    accept: "json",
    input: z.object({
        groupId: z.number().int().positive(),
        applicationIds: z.array(z.number().int().positive()).min(1),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingGroup = await db.query.groups.findFirst({ where: { id: input.groupId } });
            if (!existingGroup) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.groupNotFound" });
            }

            const applicationIds = [...new Set(input.applicationIds)];
            const existingApplications = await db
                .select({ id: applications.id })
                .from(applications)
                .where(inArray(applications.id, applicationIds));
            if (existingApplications.length !== applicationIds.length) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.someApplicationsNotFound" });
            }

            await db
                .insert(groupsToApplications)
                .values(applicationIds.map((applicationId) => ({ groupId: input.groupId, applicationId })))
                .onConflictDoNothing();

            logEvent({
                type: "group_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "groups",
                targetId: input.groupId,
                detail: `applications_added:${applicationIds.length}`,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});

export const removeApplicationsFromGroup = defineAction({
    accept: "json",
    input: z.object({
        groupId: z.number().int().positive(),
        applicationIds: z.array(z.number().int().positive()).min(1),
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }

            const db = getDrizzle();
            const existingGroup = await db.query.groups.findFirst({ where: { id: input.groupId } });
            if (!existingGroup) {
                throw new ActionError({ code: "BAD_REQUEST", message: "errors.groupNotFound" });
            }

            const applicationIds = [...new Set(input.applicationIds)];
            await db
                .delete(groupsToApplications)
                .where(
                    and(
                        eq(groupsToApplications.groupId, input.groupId),
                        inArray(groupsToApplications.applicationId, applicationIds),
                    ),
                );

            logEvent({
                type: "group_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "groups",
                targetId: input.groupId,
                detail: `applications_removed:${applicationIds.length}`,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
