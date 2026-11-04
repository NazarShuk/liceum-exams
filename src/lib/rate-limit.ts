import { ActionError } from "astro:actions";
import { env } from "cloudflare:workers";

type LimiterName = "SUBMIT_LIMITER" | "DRAFT_LIMITER" | "UPLOAD_LIMITER" | "AUTH_LIMITER";

export async function rateLimit(name: LimiterName, key: string) {
    const limiter = env[name] as RateLimit | undefined;
    return !limiter || (await limiter.limit({ key })).success;
}

export async function enforceRateLimit(name: LimiterName, key: string) {
    if (await rateLimit(name, key)) return;
    throw new ActionError({ code: "TOO_MANY_REQUESTS", message: "Забагато запитів. Спробуйте пізніше." });
}
