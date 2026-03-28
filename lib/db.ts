import prisma from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

const { PrismaClient: RuntimePrismaClient } = prisma;

let resolvedDb = globalThis.__db__;

function getDbClient(): PrismaClient {
  if (resolvedDb) {
    return resolvedDb;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to initialize PrismaClient");
  }

  resolvedDb = new RuntimePrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__db__ = resolvedDb;
  }

  return resolvedDb;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDbClient() as object, prop, receiver);
  },
});
