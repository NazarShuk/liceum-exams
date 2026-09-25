import { defineAction } from "astro:actions";
import {z} from "astro/zod";

export const server = {
    login: defineAction({
        accept: "form",
        input: z.object({
            firstName: z.string(),
            lastName: z.string(),
            phone: z.int()
        }),
        handler: async (input)=> {
            return {success: true}
        }
    })
}