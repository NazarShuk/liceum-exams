import type { APIRoute } from "astro";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ locals }) => {
  const adapter = new PrismaD1(env.DB);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany();

  return Response.json(users);
};
