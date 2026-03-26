import type { Prisma, PrismaClient } from "@prisma/client";
import { AuthorityNotFoundError, MatterNotFoundError } from "./errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function ensureMatterExists(db: DbClient, matterId: string): Promise<void> {
  const matter = await db.matter.findUnique({ where: { id: matterId }, select: { id: true } });
  if (!matter) throw new MatterNotFoundError(matterId);
}

export async function requireAuthority(db: DbClient, authorityId: string) {
  const authority = await db.authority.findUnique({ where: { id: authorityId } });
  if (!authority) throw new AuthorityNotFoundError(authorityId);
  return authority;
}
