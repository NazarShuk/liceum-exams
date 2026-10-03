import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  applications: {
    user: r.one.users({
      from: r.applications.userId,
      to: r.users.id,
    }),
    student: r.one.students({
      from: r.applications.studentId,
      to: r.students.id,
    }),
  },
}));