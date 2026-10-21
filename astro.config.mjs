// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  output: "server",
  adapter: cloudflare(),

  prefetch: {
    defaultStrategy: "hover"
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: "e-Ukraine",
      cssVariable: "--font-e-ukraine",
      options: {
        variants: [
          {
            src:["./src/assets/fonts/e-Ukraine-Regular.otf"],
            weight: "normal",
            style: "normal"
          },
          {
            src:["./src/assets/fonts/e-Ukraine-Bold.otf"],
            weight: "bold",
            style: "normal"
          },
          {
            src:["./src/assets/fonts/e-Ukraine-Light.otf"],
            weight: "light",
            style: "normal"
          }
        ]
      }
    }
  ],

  integrations: [svelte({extensions: [".svelte"]})]
});