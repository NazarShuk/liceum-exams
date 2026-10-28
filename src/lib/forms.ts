import { eq } from "drizzle-orm";
import { getDrizzle } from "@db/drizzle";
import { applications, forms, profiles } from "@db/schema";

type Db = ReturnType<typeof getDrizzle>;

/** Delete a form once nothing points at it, so discarded forms do not pile up. */
export async function deleteFormIfUnused(db: Db, formId: number) {
    const [profileCount, applicationCount] = await Promise.all([
        db.$count(profiles, eq(profiles.formId, formId)),
        db.$count(applications, eq(applications.formId, formId)),
    ]);

    if (profileCount === 0 && applicationCount === 0) {
        await db.delete(forms).where(eq(forms.id, formId));
    }
}
