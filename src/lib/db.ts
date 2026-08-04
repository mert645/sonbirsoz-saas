import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  // AWS RDS uses a private CA that isn't in the default trust store, so a plain
  // `sslmode=require` fails with "self-signed certificate in certificate chain".
  // Enable TLS without CA verification when SSL is requested, and strip the
  // connection-string sslmode so it can't override the ssl option below.
  const wantsSsl = /sslmode=(require|verify|prefer)|ssl=true/i.test(rawUrl);
  const connectionString = rawUrl
    .replace(/([?&])sslmode=[^&]*/i, "$1")
    .replace(/[?&]$/, "");
  const pool = new Pool({
    connectionString,
    max: 10,
    ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
