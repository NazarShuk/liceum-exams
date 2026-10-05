import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  applications: {
    user: r.one.users({
      from: r.applications.userId,
      to: r.users.id,
    }),
    student: r.one.users({
      from: r.applications.studentId,
      to: r.users.id,
    }),
    form: r.one.forms({
      from: r.applications.formId,
      to: r.forms.id
    })
  },
  users: {
    children: r.many.users({
      from: r.users.id,
      to: r.users.parentId,
    }),
    parent: r.one.users({
      from: r.users.parentId,
      to: r.users.id,
    }),
  }
}));