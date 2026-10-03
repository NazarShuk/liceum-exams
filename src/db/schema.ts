import { sqliteTable, integer, text} from "drizzle-orm/sqlite-core";
import { defineRelations, sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({autoIncrement: true}),

    firstName: text(),
    lastName: text(),
    middleName: text(),
    birthDate: integer({mode: "timestamp"}),
    phone: text("phone"),

    data: text("data", {"mode": "json"}),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const students = sqliteTable("students", {
    id: integer("id").primaryKey({autoIncrement: true}),

    firstName: text(),
    lastName: text(),
    middleName: text(),
    birthDate: integer({mode: "timestamp"}),
    phone: text("phone"),

    data: text("data", {"mode": "json"}),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const applications = sqliteTable("applications", {
    id: integer("id").primaryKey({autoIncrement: true}),

    userId: integer().notNull().references(()=> users.id, {onDelete: "cascade"}),
    studentId: integer().notNull().references(()=> students.id, {onDelete: "cascade"}),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})