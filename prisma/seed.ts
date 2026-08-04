import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const rawUrl = process.env.DATABASE_URL ?? "";
const wantsSsl = /sslmode=(require|verify|prefer)|ssl=true/i.test(rawUrl);
// node-postgres lets the connection-string sslmode override the ssl object,
// which re-enables CA verification and breaks against RDS. Strip it and drive
// TLS purely through the ssl option.
const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, "");
const pool = new Pool({
  connectionString,
  ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@sonbirsoz.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const name = process.env.SEED_ADMIN_NAME || "Yönetici";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name },
    create: { email, passwordHash, role: "ADMIN", name },
  });

  console.log(`✓ Admin kullanıcı hazır: ${admin.email} (rol: ${admin.role})`);

  // Seed core categories so the site has real navigation data.
  const categories = [
    { name: "Gündem", slug: "gundem", color: "#EF4444", order: 1 },
    { name: "Politika", slug: "politika", color: "#3B82F6", order: 2 },
    { name: "Ekonomi", slug: "ekonomi", color: "#10B981", order: 3 },
    { name: "Dünya", slug: "dunya", color: "#6366F1", order: 4 },
    { name: "Spor", slug: "spor", color: "#F59E0B", order: 5 },
    { name: "Teknoloji", slug: "teknoloji", color: "#8B5CF6", order: 6 },
    { name: "Sağlık", slug: "saglik", color: "#14B8A6", order: 7 },
    { name: "Yaşam", slug: "yasam", color: "#EC4899", order: 8 },
    { name: "Magazin", slug: "magazin", color: "#F97316", order: 9 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, color: cat.color, order: cat.order },
      create: cat,
    });
  }

  console.log(`✓ ${categories.length} kategori hazır.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("Seed hatası:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
