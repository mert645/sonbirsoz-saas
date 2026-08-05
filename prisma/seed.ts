import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const rawUrl = process.env.DATABASE_URL ?? "";
const wantsSsl = /sslmode=(require|verify|prefer)|ssl=true/i.test(rawUrl);
const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, "");
const pool = new Pool({
  connectionString,
  ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 SaaS Seed başlatılıyor...\n");

  // ═══════════════════════════════════════════════════════════════
  // 1. Demo Tenant Oluştur
  // ═══════════════════════════════════════════════════════════════
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {
      name: "Demo Haber Sitesi",
      primaryColor: "#4F46E5",
      isActive: true,
    },
    create: {
      name: "Demo Haber Sitesi",
      slug: "demo",
      domain: null,
      primaryColor: "#4F46E5",
      plan: "PROFESSIONAL",
      isActive: true,
    },
  });
  console.log(`✓ Demo tenant oluşturuldu: ${demoTenant.name} (slug: ${demoTenant.slug})`);

  // Tenant Settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      siteName: "Demo Haber",
      tagline: "Güncel haberler, doğru bilgi",
      aiGenerationEnabled: true,
      aiModerationEnabled: true,
      videoStudioEnabled: true,
      newsletterEnabled: true,
      pushEnabled: true,
      customDomainEnabled: false,
      apiAccessEnabled: false,
    },
  });
  console.log(`✓ Demo tenant ayarları oluşturuldu`);

  // ═══════════════════════════════════════════════════════════════
  // 2. Super Admin Kullanıcı (Platform Yöneticisi)
  // ═══════════════════════════════════════════════════════════════
  const superAdminEmail = "superadmin@sonbirsoz-saas.com";
  const superAdminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { passwordHash: superAdminHash, role: "SUPER_ADMIN" },
    create: {
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      name: "Platform Yöneticisi",
    },
  });
  console.log(`✓ Super Admin oluşturuldu: ${superAdmin.email}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. Demo Tenant Admin Kullanıcı
  // ═══════════════════════════════════════════════════════════════
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@demo.sonbirsoz-saas.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const adminName = process.env.SEED_ADMIN_NAME || "Demo Admin";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "ADMIN", name: adminName },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      name: adminName,
    },
  });
  console.log(`✓ Demo Admin oluşturuldu: ${admin.email}`);

  // Admin'i demo tenant'a bağla
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: admin.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      tenantId: demoTenant.id,
      userId: admin.id,
      role: "OWNER",
    },
  });
  console.log(`✓ Demo Admin, demo tenant'a OWNER olarak bağlandı`);

  // ═══════════════════════════════════════════════════════════════
  // 4. Demo Tenant Kategorileri
  // ═══════════════════════════════════════════════════════════════
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
      where: {
        tenantId_slug: {
          tenantId: demoTenant.id,
          slug: cat.slug,
        },
      },
      update: { name: cat.name, color: cat.color, order: cat.order },
      create: {
        tenantId: demoTenant.id,
        ...cat,
      },
    });
  }
  console.log(`✓ ${categories.length} kategori oluşturuldu (demo tenant)`);

  // ═══════════════════════════════════════════════════════════════
  // 5. Demo Tenant Yazarı
  // ═══════════════════════════════════════════════════════════════
  const author = await prisma.author.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: "demo-yazar",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Demo Yazar",
      slug: "demo-yazar",
      bio: "Demo haber sitesinin örnek yazarı.",
      email: "yazar@demo.sonbirsoz-saas.com",
      isActive: true,
    },
  });
  console.log(`✓ Demo yazar oluşturuldu: ${author.name}`);

  // ═══════════════════════════════════════════════════════════════
  // 6. Örnek Tenant: Müzik Haberleri
  // ═══════════════════════════════════════════════════════════════
  const muzikTenant = await prisma.tenant.upsert({
    where: { slug: "muzik" },
    update: {},
    create: {
      name: "Son Bir Söz Müzik",
      slug: "muzik",
      domain: null,
      primaryColor: "#EC4899",
      plan: "STARTER",
      isActive: true,
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: muzikTenant.id },
    update: {},
    create: {
      tenantId: muzikTenant.id,
      siteName: "SBS Müzik",
      tagline: "Müzik dünyasından son haberler",
      aiGenerationEnabled: false,
      aiModerationEnabled: false,
      videoStudioEnabled: false,
      newsletterEnabled: true,
      pushEnabled: true,
    },
  });

  const muzikCategories = [
    { name: "Pop", slug: "pop", color: "#EC4899", order: 1 },
    { name: "Rock", slug: "rock", color: "#EF4444", order: 2 },
    { name: "Hip-Hop", slug: "hip-hop", color: "#8B5CF6", order: 3 },
    { name: "Türk Müziği", slug: "turk-muzigi", color: "#F59E0B", order: 4 },
    { name: "Klasik", slug: "klasik", color: "#6366F1", order: 5 },
    { name: "Konserler", slug: "konserler", color: "#10B981", order: 6 },
  ];

  for (const cat of muzikCategories) {
    await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: muzikTenant.id,
          slug: cat.slug,
        },
      },
      update: {},
      create: { tenantId: muzikTenant.id, ...cat },
    });
  }
  console.log(`✓ Müzik tenant oluşturuldu: ${muzikTenant.name} (${muzikCategories.length} kategori)`);

  // ═══════════════════════════════════════════════════════════════
  // 7. Örnek Tenant: Spor Haberleri
  // ═══════════════════════════════════════════════════════════════
  const sporTenant = await prisma.tenant.upsert({
    where: { slug: "spor" },
    update: {},
    create: {
      name: "Son Bir Söz Spor",
      slug: "spor",
      domain: null,
      primaryColor: "#10B981",
      plan: "STARTER",
      isActive: true,
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: sporTenant.id },
    update: {},
    create: {
      tenantId: sporTenant.id,
      siteName: "SBS Spor",
      tagline: "Spor dünyasından anlık haberler",
      aiGenerationEnabled: false,
      aiModerationEnabled: false,
      videoStudioEnabled: false,
      newsletterEnabled: true,
      pushEnabled: true,
    },
  });

  const sporCategories = [
    { name: "Futbol", slug: "futbol", color: "#10B981", order: 1 },
    { name: "Basketbol", slug: "basketbol", color: "#F59E0B", order: 2 },
    { name: "Voleybol", slug: "voleybol", color: "#3B82F6", order: 3 },
    { name: "Tenis", slug: "tenis", color: "#8B5CF6", order: 4 },
    { name: "Formula 1", slug: "formula-1", color: "#EF4444", order: 5 },
    { name: "E-Spor", slug: "e-spor", color: "#6366F1", order: 6 },
  ];

  for (const cat of sporCategories) {
    await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: sporTenant.id,
          slug: cat.slug,
        },
      },
      update: {},
      create: { tenantId: sporTenant.id, ...cat },
    });
  }
  console.log(`✓ Spor tenant oluşturuldu: ${sporTenant.name} (${sporCategories.length} kategori)`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n✅ SaaS Seed tamamlandı!");
  console.log("\n📋 Oluşturulan Tenant'lar:");
  console.log("   - demo.sonbirsoz-saas.com (Professional)");
  console.log("   - muzik.sonbirsoz-saas.com (Starter)");
  console.log("   - spor.sonbirsoz-saas.com (Starter)");
  console.log("\n🔑 Giriş Bilgileri:");
  console.log(`   Super Admin: superadmin@sonbirsoz-saas.com`);
  console.log(`   Demo Admin:  ${adminEmail}`);
  console.log(`   Şifre:       ${adminPassword}`);
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
