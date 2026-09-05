import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "./seed";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await client.$transaction((db) => seedDatabase(db), { timeout: 120_000 });
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
