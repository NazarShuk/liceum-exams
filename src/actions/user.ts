import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { users } from "@db/schema";
import { logEvent } from "@lib/analytics";

const role = z.enum(["applicant", "parent", "teacher", "admin"]);

export const updateUserRole = defineAction({
    accept: "json",
    input: z.object({
        userId: z.number().int().positive(),
        role,
    }),
    handler: async (input, context) => {
        try {
            if (!context.locals.user || context.locals.user.role !== "admin") {
                throw new ActionError({ code: "UNAUTHORIZED" });
            }
            if (input.userId === context.locals.user.id) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Не можна змінити власну роль" });
            }

            const db = getDrizzle();
            const existingUser = await db.query.users.findFirst({ where: { id: input.userId } });
            if (!existingUser) {
                throw new ActionError({ code: "BAD_REQUEST", message: "Користувача не знайдено" });
            }
            if (existingUser.role === input.role) {
                return { success: true };
            }

            await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
            logEvent({
                type: "user_role_update",
                user: context.locals.user,
                path: context.url?.pathname,
                target: "users",
                targetId: input.userId,
                detail: `${existingUser.role}->${input.role}`,
            });
            return { success: true };
        } catch (error) {
            if (error instanceof ActionError) throw error;
            console.error(error);
            throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
        }
    },
});
