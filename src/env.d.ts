/// <reference path="../.astro/types.d.ts" />
import type { users } from "./db/schema";

declare global {
    namespace App {
        interface Locals {
            user: typeof users.$inferSelect;
        }
    }

    namespace Cloudflare {
        interface Env {
            TURNSTILE_SECRET: string;
            TURNSTILE_HOSTNAMES: string;
        }
    }

    interface Window {
        turnstile?: {
            render(
                container: HTMLElement | string,
                options: {
                    sitekey: string;
                    action?: string;
                    appearance?: "always" | "execute" | "interaction-only";
                    callback?: (token: string) => void;
                    "expired-callback"?: () => void;
                    "error-callback"?: () => void;
                },
            ): string;
            reset(widgetId?: string): void;
            remove(widgetId?: string): void;
        };
    }
}

export {};
