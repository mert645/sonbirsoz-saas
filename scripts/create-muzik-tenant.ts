import "dotenv/config";
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🎵 Son Bir Söz Müzik tenant'ı oluşturuluyor...\n");

  // 1. Tenant oluştur
  const tenant = await prisma.tenant.upsert({
    where: { slug: "muzik" },
    update: {},
    create: {
      name: "Son Bir Söz Müzik",
      slug: "muzik",
      primaryColor: "#9333EA", // Mor tema
      plan: "PROFESSIONAL",
      isActive: true,
    },
  });
  console.log("✅ Tenant oluşturuldu:", tenant.name);

  // 2. Tenant Settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      siteName: "Son Bir Söz Müzik",
      tagline: "Müzik dünyasından en güncel haberler",
      defaultSeoTitle: "Son Bir Söz Müzik - Müzik Haberleri",
      defaultSeoDescription: "Pop, rock, rap ve daha fazlası. Müzik dünyasının nabzı burada atıyor.",
    },
  });
  console.log("✅ Tenant ayarları oluşturuldu");

  // 3. Subscription
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
    },
  });
  console.log("✅ Abonelik oluşturuldu (Professional Plan)");

  // 4. Admin kullanıcı oluştur
  const hashedPassword = await bcrypt.hash("muzik123", 12);
  
  const user = await prisma.user.upsert({
    where: { email: "admin@muzik.sonbirsoz.com" },
    update: {},
    create: {
      email: "admin@muzik.sonbirsoz.com",
      name: "Müzik Admin",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin kullanıcı oluşturuldu:", user.email);

  // 5. Kullanıcıyı tenant'a bağla
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "ADMIN",
    },
  });
  console.log("✅ Kullanıcı tenant'a bağlandı");

  // 6. Kategoriler oluştur
  const categories = [
    { name: "Pop", slug: "pop", color: "#EC4899", icon: "🎤" },
    { name: "Rock", slug: "rock", color: "#EF4444", icon: "🎸" },
    { name: "Rap & Hip-Hop", slug: "rap-hip-hop", color: "#F59E0B", icon: "🎧" },
    { name: "Elektronik", slug: "elektronik", color: "#3B82F6", icon: "🎹" },
    { name: "Klasik", slug: "klasik", color: "#8B5CF6", icon: "🎻" },
    { name: "Türk Müziği", slug: "turk-muzigi", color: "#10B981", icon: "🎵" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: cat.slug,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        icon: cat.icon,
      },
    });
  }
  console.log("✅ Kategoriler oluşturuldu:", categories.map(c => c.name).join(", "));

  // 7. Örnek yazar oluştur
  const author = await prisma.author.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "muzik-editoru",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Müzik Editörü",
      slug: "muzik-editoru",
      email: "editor@muzik.sonbirsoz.com",
      bio: "Müzik dünyasının nabzını tutan editörümüz.",
      isActive: true,
    },
  });
  console.log("✅ Yazar oluşturuldu:", author.name);

  // 8. Örnek makale oluştur
  const popCategory = await prisma.category.findFirst({
    where: { tenantId: tenant.id, slug: "pop" },
  });

  if (popCategory) {
    await prisma.article.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: "hosgeldiniz-son-bir-soz-muzik",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        title: "Hoş Geldiniz! Son Bir Söz Müzik Yayında",
        slug: "hosgeldiniz-son-bir-soz-muzik",
        spot: "Müzik dünyasının en güncel haberleri artık burada. Pop'tan rock'a, rap'ten klasiğe tüm müzik haberleri için doğru adrestesiniz.",
        content: `
# Son Bir Söz Müzik'e Hoş Geldiniz!

Müzik tutkunları için hazırladığımız bu platformda, müzik dünyasının en güncel haberlerini bulacaksınız.

## Neler Bulacaksınız?

- **Pop Müzik**: En popüler sanatçıların haberleri
- **Rock**: Efsanevi gruplardan yeni nesil rock'çılara
- **Rap & Hip-Hop**: Sokaktan dünyaya yayılan ritimler
- **Elektronik**: DJ'ler, festivaller ve daha fazlası
- **Klasik Müzik**: Zamansız eserler ve yorumcular
- **Türk Müziği**: Yerli sanatçılarımızdan haberler

Bizi takip etmeye devam edin!
        `.trim(),
        categoryId: popCategory.id,
        authorId: author.id,
        userId: user.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
        isFeatured: true,
        readingTime: 2,
      },
    });
    console.log("✅ Örnek makale oluşturuldu");
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Son Bir Söz Müzik tenant'ı başarıyla oluşturuldu!");
  console.log("=".repeat(50));
  console.log("\n📋 Giriş Bilgileri:");
  console.log("   URL: http://muzik.localhost:3000");
  console.log("   Admin: http://muzik.localhost:3000/admin/giris");
  console.log("   E-posta: admin@muzik.sonbirsoz.com");
  console.log("   Şifre: muzik123");
  console.log("\n⚠️  Önemli: hosts dosyasına şu satırı eklemeyi unutmayın:");
  console.log("   127.0.0.1 muzik.localhost");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
