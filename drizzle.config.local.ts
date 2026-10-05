import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/7e0ac6216bf6d4158b118e481ea284367355311f73232ef80264a12b2d383be4.sqlite"
  }
});