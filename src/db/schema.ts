import { sqliteTable, integer, text, primaryKey} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({autoIncrement: true}),
    externalId: integer("external_id"),

    firstName: text().notNull(),
    lastName: text().notNull(),
    middleName: text(),
    birthDate: integer({mode: "timestamp"}),
    phone: text("phone"),
    data: text("data", {mode: "json"}),
    role: text("role", {enum: ["applicant", "parent", "teacher", "admin"]}).notNull().default("parent"),

    parentId: integer("parent_id"),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const applications = sqliteTable("applications", {
    id: integer("id").primaryKey({autoIncrement: true}),

    userId: integer("user_id").notNull().references(()=> users.id, {onDelete: "cascade"}),
    studentId: integer("student_id").notNull().references(()=> users.id, {onDelete: "cascade"}),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
     .notNull()
     .default(sql`(CURRENT_TIMESTAMP)`)
     .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
    
    formId: integer("form_id").notNull().references(()=>forms.id, {onDelete: "cascade"}),
    profileId: integer("profile_id").references(()=>profiles.id, {onDelete: "set null"}),
    answers: text({mode:"json"}).notNull().default("{}").$type<{[key:string]: any}>(),
    state: text({enum: ["draft", "submitted"]}).notNull().default("draft")
})

export const forms = sqliteTable("forms", {
    id: integer("id").primaryKey({autoIncrement: true}),
    title: text("title").notNull(),
    description: text("description"),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
     .notNull()
     .default(sql`(CURRENT_TIMESTAMP)`)
     .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),

    schema: text("schema", {mode:"json"}).$type<
        {
            slug:string,
            title:string,
            type: "text"|"number"|"date"|"file",
            regex:string,
            max:number,
            min:number
        }[]
    >().notNull().default([]),
})

export const campaigns = sqliteTable("campaigns", {
    id: integer("id").primaryKey({autoIncrement: true}),
    title: text("title").notNull(),
    beginsAt: integer("begins_at", {mode: "timestamp"}),
    endsAt: integer("ends_at", {mode: "timestamp"})
})

export const profiles = sqliteTable("profiles", {
    id: integer("id").primaryKey({autoIncrement: true}),
    title: text("title").notNull(),
    description: text("description"),

    formId: integer().references(()=>forms.id),
})

export const campaignsToProfiles = sqliteTable("campaigns_to_profiles", {
    campaignId: integer("campaign_id").notNull().references(()=> campaigns.id, {onDelete: "cascade"}),
    profileId: integer("profile_id").notNull().references(()=> profiles.id, {onDelete: "cascade"})
}, (t) => [primaryKey({ columns: [t.campaignId, t.profileId] })])