import { env } from "cloudflare:workers";

const EXPECTED_ACTION = "application";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
        .split(",")
        .map((hostname) => hostname.trim())
        .filter(Boolean),
);

/** Canonical server-side Turnstile check. Returns false on any doubt. */
export async function verifyTurnstile(token: unknown, request: Request): Promise<boolean> {
    if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
    if (expectedHostnames.size === 0 || !env.TURNSTILE_SECRET) return false;

    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
    const remoteIp = request.headers.get("CF-Connecting-IP");
    if (remoteIp) body.set("remoteip", remoteIp);

    let result: { success?: boolean; action?: string; hostname?: string };
    try {
        const response = await fetch(VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            signal: AbortSignal.timeout(10_000),
            body,
        });
        if (!response.ok) return false;
        result = await response.json();
    } catch {
        return false;
    }

    return result.success === true && result.action === EXPECTED_ACTION && expectedHostnames.has(result.hostname ?? "");
}
