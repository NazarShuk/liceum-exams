import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { relations } from "./relations";


export function getDrizzle(){
    return drizzle(env.DB, { relations })
}