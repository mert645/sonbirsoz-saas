# Son Bir Söz SaaS Platform

Multi-tenant haber/içerik yönetim SaaS platformu.

## Proje Yapısı

```
sonbirsoz-saas/
├── prisma/
│   └── schema.prisma      # Multi-tenant veritabanı şeması
├── src/
│   ├── app/
│   │   ├── (admin)/       # Tenant admin paneli
│   │   ├── (public)/      # Tenant public site
│   │   └── (superadmin)/  # Platform yönetim paneli (TODO)
│   ├── components/
│   ├── lib/
│   │   ├── tenant/        # Tenant context & utilities
│   │   └── ...
│   └── middleware.ts      # Subdomain routing
└── ...
```

## Multi-Tenancy Mimarisi

### Tenant Routing

| URL | Tenant |
|-----|--------|
| `muzik.sonbirsoz-saas.com` | muzik |
| `spor.sonbirsoz-saas.com` | spor |
| `admin.sonbirsoz-saas.com` | Super Admin |
| `localhost:3000` | demo (development) |

### Veritabanı İzolasyonu

Tüm içerik modelleri `tenantId` ile ayrılır:
- Article, Category, Author, Media, Tag
- Comment, SocialPost, RSSSource
- AIGenerationJob, MediaGeneration, ModerationLog
- PushSubscription, NewsletterSubscriber

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Variables

`.env.local` dosyası oluştur:

```env
# Database (Neon PostgreSQL - Development)
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Development tenant
DEV_TENANT_SLUG="demo"

# Base domain (production)
BASE_DOMAIN="sonbirsoz-saas.com"
```

### 3. Veritabanı Kurulumu

```bash
# Prisma client oluştur
npx prisma generate

# Veritabanını oluştur (development)
npx prisma db push
```

### 4. Demo Tenant Oluştur

```bash
npx prisma db seed
```

### 5. Geliştirme Sunucusu

```bash
npm run dev
```

## Planlar

| Özellik | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Fiyat | $20/ay | $60/ay | Özel |
| Kullanıcı | 1 | 5 | Sınırsız |
| Haber/ay | 500 | 2.000 | Sınırsız |
| AI Üretim | ❌ | ✅ | ✅ |
| Video Stüdyo | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ |
| API Erişimi | ❌ | ❌ | ✅ |

## Geliştirme Fazları

- [x] **Faz 1**: Multi-Tenancy Altyapısı
  - [x] Tenant modeli
  - [x] Tüm modellere tenantId
  - [x] Tenant context provider
  - [x] Subdomain routing middleware
  - [ ] Demo tenant seed
  - [ ] API route'larında tenant filtreleme

- [ ] **Faz 2**: Onboarding & Tenant Yönetimi
- [ ] **Faz 3**: Billing & Subscription
- [ ] **Faz 4**: White-Label & Theming
- [ ] **Faz 5**: API & Entegrasyonlar
- [ ] **Faz 6**: Gelişmiş Özellikler

## Lisans

Proprietary - Tüm hakları saklıdır.
