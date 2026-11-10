// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

import svelte from "@astrojs/svelte";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },
    site: "https://liceum-exams.nshis.com",

    // Locale routing is handled in src/middleware.ts so the existing page files
    // can serve both `/` and `/en/...` without duplication.
    i18n: {
        locales: ["uk", "en"],
        defaultLocale: "uk",
        routing: "manual",
    },

    output: "server",
    adapter: cloudflare(),

    security: {
        // Actions default to 1 MB; the no-JS file fallback still posts a file to the submit action.
        actionBodySizeLimit: 12 * 1024 * 1024,
    },

    prefetch: {
        defaultStrategy: "hover",
    },

    fonts: [
        {
            provider: fontProviders.local(),
            name: "e-Ukraine",
            cssVariable: "--font-e-ukraine",
            options: {
                variants: [
                    {
                        src: ["./src/assets/fonts/e-Ukraine-Regular.otf"],
                        weight: "normal",
                        style: "normal",
                    },
                    {
                        src: ["./src/assets/fonts/e-Ukraine-Bold.otf"],
                        weight: "bold",
                        style: "normal",
                    },
                    {
                        src: ["./src/assets/fonts/e-Ukraine-Light.otf"],
                        weight: "light",
                        style: "normal",
                    },
                ],
            },
        },
    ],

    integrations: [
        svelte({ extensions: [".svelte"] }),
        sitemap({ i18n: { defaultLocale: "uk", locales: { uk: "uk-UA", en: "en-GB" } } }),
    ],
});
