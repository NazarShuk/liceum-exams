import { sqliteTable, integer, text} from "drizzle-orm/sqlite-core";
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

    userId: integer().notNull().references(()=> users.id, {onDelete: "cascade"}),
    studentId: integer().notNull().references(()=> users.id, {onDelete: "cascade"}),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})