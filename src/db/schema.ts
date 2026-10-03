import { sqliteTable, integer, text} from "drizzle-orm/sqlite-core";
import { defineRelations, sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({autoIncrement: true}),

    firstName: text(),
    lastName: text(),
    middleName: text(),
    birthDate: integer({mode: "timestamp"}),
    phone: text("phone"),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const students = sqliteTable("students", {
    id: integer("id").primaryKey({autoIncrement: true}),

    firstName: text(),
    lastName: text(),
    middleName: text(),
    birthDate: integer({mode: "timestamp"}),
    phone: text("phone"),

    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
})

export const applications = sqliteTable("applications", {
    id: integer("id").primaryKey({autoIncrement: true}),

    userId: integer(),
    studentId: integer()
})

const relations = defineRelations({applications, students, users}, (r)=> ({
    applications: {
        user: r.one.users({
            from: r.applications.userId,
            to: r.users.id
        }),
        student: r.one.students({
            from: r.applications.studentId,
            to: r.students.id
        })
    }
}))