import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

export const db = globalThis.__db__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__db__ = db;
}
