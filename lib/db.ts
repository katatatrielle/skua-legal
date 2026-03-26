import type { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

let resolvedDb = globalThis.__db__;

if (!resolvedDb) {
  const { PrismaClient: RuntimePrismaClient } = await import("@prisma/client");
  resolvedDb = new RuntimePrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__db__ = resolvedDb;
  }
}

export const db: PrismaClient = resolvedDb;
