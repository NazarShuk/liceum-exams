import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export function getDrizzle(){
    return drizzle(env.liceum_exams)
}