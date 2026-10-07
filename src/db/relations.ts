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
  },
  campaigns: {
    profiles: r.many.profiles({
      from: r.campaigns.id.through(r.campaignsToProfiles.campaignId),
      to: r.profiles.id.through(r.campaignsToProfiles.profileId),
    }),
  },
  profiles: {
    campaigns: r.many.campaigns({
      from: r.profiles.id.through(r.campaignsToProfiles.profileId),
      to: r.campaigns.id.through(r.campaignsToProfiles.campaignId),
    }),
    form: r.one.forms({
      from: r.profiles.formId,
      to: r.forms.id,
    }),
  },
}));