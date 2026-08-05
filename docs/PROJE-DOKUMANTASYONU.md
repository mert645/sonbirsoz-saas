# SonBirSöz SaaS Platform - Proje Dokümantasyonu

**Versiyon:** 1.0  
**Son Güncelleme:** 5 Ağustos 2026  
**Proje Durumu:** Geliştirme Aşamasında (Phase 4 Tamamlandı)

---

## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [Mimari Yapı](#mimari-yapı)
3. [Tamamlanan Fazlar](#tamamlanan-fazlar)
4. [Dosya Yapısı](#dosya-yapısı)
5. [Veritabanı Şeması](#veritabanı-şeması)
6. [API Endpoints](#api-endpoints)
7. [Eksik Kalan Kısımlar](#eksik-kalan-kısımlar)
8. [Canlıya Taşıma Rehberi](#canlıya-taşıma-rehberi)
9. [Geliştirici Notları](#geliştirici-notları)

---

## 🎯 Proje Özeti

### Amaç
Mevcut **Son Bir Söz** haber sitesi admin panelini, farklı müşterilere satılabilecek **multi-tenant SaaS platformuna** dönüştürmek.

### Hedef Kullanım Senaryoları
- `sonbirsozmuzik.com` - Müzik haberleri sitesi
- `sonbirsozspor.com` - Spor haberleri sitesi
- `demo.sonbirsoz-saas.com` - Demo tenant
- Farklı firmalar için white-label çözümler

### Teknoloji Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js |
| Hosting | AWS Amplify (mevcut) |

---

## 🏗️ Mimari Yapı

### Multi-Tenancy Modeli
**Seçilen Yaklaşım:** Shared Database, Shared Schema + `tenantId`

```
┌─────────────────────────────────────────────────────────────┐
│                         KULLANICILAR                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Public Site   │   Admin Panel   │     Super Admin         │
│  (Ziyaretçiler) │ (Tenant Admin)  │  (Platform Yöneticisi)  │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /(public)   │  │ /(admin)    │  │ /(superadmin)       │  │
│  │ Route Group │  │ Route Group │  │ Route Group         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Proxy/Middleware                        │
│  - Tenant identification (subdomain/header)                  │
│  - Authentication check                                      │
│  - Role-based access control                                 │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ PostgreSQL      │ │ AWS S3          │ │ External APIs   │
│ (Neon)          │ │ (Media Storage) │ │ (AI, Social)    │
│ - tenantId      │ │                 │ │                 │
│   isolation     │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Route Grupları
```
src/app/
├── (public)/          # Herkese açık sayfalar (haber okuma)
├── (admin)/           # Tenant admin paneli
├── (superadmin)/      # Platform yönetim paneli
├── api/               # API endpoints
│   ├── admin/         # Tenant-scoped APIs
│   ├── superadmin/    # Platform-wide APIs
│   └── tenant/        # Public tenant APIs
└── superadmin-giris/  # Super admin login (route group dışında)
```

---

## ✅ Tamamlanan Fazlar

### Phase 1: Multi-Tenancy Altyapısı ✓

**Tamamlanan İşler:**
- [x] Tenant, TenantUser, TenantSettings, TenantSubscription modelleri
- [x] Tüm içerik modellerine `tenantId` eklendi (Article, Category, Author, Media, vb.)
- [x] Tenant context provider (React)
- [x] Subdomain/header bazlı tenant routing (`src/proxy.ts`)
- [x] API route'larında tenant izolasyonu

**Önemli Dosyalar:**
```
prisma/schema.prisma          # Veritabanı şeması
src/lib/tenant/get-tenant.ts  # Tenant ID alma
src/lib/tenant/context.tsx    # React context
src/proxy.ts                  # Routing middleware
```

---

### Phase 2: Onboarding & Tenant Yönetimi ✓

**Tamamlanan İşler:**
- [x] Super Admin paneli (dashboard, tenants, users, settings, system)
- [x] Tenant CRUD API'leri
- [x] Tenant onboarding wizard (çok adımlı form)
- [x] Kullanıcı davet sistemi (email invitation)
- [x] Tenant ayarları sayfası

**Super Admin Sayfaları:**
| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Dashboard | `/superadmin/dashboard` | Platform istatistikleri |
| Tenants | `/superadmin/tenants` | Tenant listesi ve yönetimi |
| Users | `/superadmin/users` | Tüm kullanıcılar |
| Billing | `/superadmin/billing` | Abonelik yönetimi |
| Settings | `/superadmin/settings` | Platform ayarları |
| System | `/superadmin/system` | Sistem durumu |

**Admin Sayfaları (Tenant-scoped):**
| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Kullanıcılar | `/admin/kullanicilar` | Tenant kullanıcıları |
| Ayarlar | `/admin/ayarlar` | Tenant ayarları |

---

### Phase 3: Billing & Subscription ✓

**Tamamlanan İşler:**
- [x] Plan limitleri tanımı (Starter, Professional, Enterprise)
- [x] Kullanım takibi sistemi (articles, storage, AI tokens, users)
- [x] Abonelik yönetimi API'leri
- [x] Super Admin billing dashboard
- [x] Tenant billing portal (plan görüntüleme, upgrade isteği)
- [x] Kullanım limiti middleware'i

**Plan Özellikleri:**
| Özellik | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Fiyat | ₺499/ay | ₺1.499/ay | Özel |
| Kullanıcı | 1 | 5 | Sınırsız |
| Makale/ay | 500 | 2.000 | Sınırsız |
| Depolama | 5 GB | 25 GB | 100 GB |
| AI Üretim | ❌ | ✅ | ✅ |
| Video Stüdyo | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ |
| API Erişimi | ❌ | ❌ | ✅ |

**Önemli Dosyalar:**
```
src/lib/billing/plans.ts      # Plan limitleri ve fiyatlar
src/lib/billing/usage.ts      # Kullanım takibi fonksiyonları
src/lib/billing/middleware.ts # Limit kontrolü helper'ları
```

---

### Phase 4: White-Label & Theming ✓

**Tamamlanan İşler:**
- [x] CSS variables tabanlı dinamik tema sistemi
- [x] Tenant logo/favicon dinamik yükleme
- [x] 15 hazır tema preseti (6 kategoride)
- [x] Tema önizleme ve seçim UI
- [x] Admin panelde tema ayarları sayfası

**Tema Kategorileri:**
- Haber (Klasik Kırmızı, Modern Mavi, Koyu Arduvaz)
- Magazin (Canlı Pembe, Kraliyet Moru)
- Teknoloji (Teknoloji Mavisi, Neon Yeşil, Derin İndigo)
- Spor (Spor Yeşili, Şampiyon Altını, Takım Laciverti)
- Eğlence (Gün Batımı)
- İş/Finans (Kurumsal Turkuaz, Finans Zümrüdü, Yönetici Grisi)

**Önemli Dosyalar:**
```
src/lib/theme/colors.ts       # Renk yardımcı fonksiyonları
src/lib/theme/provider.tsx    # Theme context provider
src/lib/theme/presets.ts      # Hazır tema presetleri
src/app/(admin)/admin/tema/   # Tema ayarları sayfası
```

---

## 📁 Dosya Yapısı

```
sonbirsoz-saas/
├── prisma/
│   ├── schema.prisma         # Veritabanı şeması
│   └── seed.ts               # Seed data
├── src/
│   ├── app/
│   │   ├── (admin)/          # Tenant admin paneli
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       ├── haberler/
│   │   │       ├── medya/
│   │   │       ├── kategoriler/
│   │   │       ├── yazarlar/
│   │   │       ├── yorumlar/
│   │   │       ├── aboneler/
│   │   │       ├── kullanicilar/  # YENİ
│   │   │       ├── fatura/        # YENİ
│   │   │       ├── tema/          # YENİ
│   │   │       ├── ayarlar/
│   │   │       └── ...
│   │   ├── (superadmin)/     # Platform yönetimi
│   │   │   └── superadmin/
│   │   │       ├── dashboard/     # YENİ
│   │   │       ├── tenants/       # YENİ
│   │   │       ├── users/         # YENİ
│   │   │       ├── billing/       # YENİ
│   │   │       ├── settings/      # YENİ
│   │   │       └── system/        # YENİ
│   │   ├── (public)/         # Herkese açık sayfalar
│   │   ├── api/
│   │   │   ├── admin/        # Tenant-scoped APIs
│   │   │   │   ├── articles/
│   │   │   │   ├── categories/
│   │   │   │   ├── billing/       # YENİ
│   │   │   │   ├── theme/         # YENİ
│   │   │   │   ├── users/         # YENİ
│   │   │   │   └── ...
│   │   │   ├── superadmin/   # Platform APIs
│   │   │   │   ├── stats/         # YENİ
│   │   │   │   ├── tenants/       # YENİ
│   │   │   │   ├── users/         # YENİ
│   │   │   │   ├── billing/       # YENİ
│   │   │   │   ├── settings/      # YENİ
│   │   │   │   └── system/        # YENİ
│   │   │   └── tenant/       # Public tenant APIs
│   │   │       └── theme/         # YENİ
│   │   ├── invite/           # Davet kabul sayfası
│   │   └── superadmin-giris/ # Super admin login
│   ├── components/
│   │   └── superadmin/
│   │       └── TenantOnboardingWizard.tsx  # YENİ
│   ├── lib/
│   │   ├── tenant/           # Tenant utilities
│   │   │   ├── context.tsx
│   │   │   ├── get-tenant.ts
│   │   │   └── server.ts
│   │   ├── billing/          # Billing utilities (YENİ)
│   │   │   ├── plans.ts
│   │   │   ├── usage.ts
│   │   │   └── middleware.ts
│   │   ├── theme/            # Theme utilities (YENİ)
│   │   │   ├── colors.ts
│   │   │   ├── provider.tsx
│   │   │   └── presets.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── ...
│   └── proxy.ts              # Routing middleware
├── docs/
│   ├── saas-roadmap.md       # Orijinal roadmap
│   └── PROJE-DOKUMANTASYONU.md  # Bu dosya
└── .env.local                # Environment variables
```

---

## 🗄️ Veritabanı Şeması

### Multi-Tenancy Modelleri

```prisma
// Ana tenant modeli
model Tenant {
  id           String     @id @default(cuid())
  name         String     // "Son Bir Söz Müzik"
  slug         String     @unique // "muzik"
  domain       String?    @unique // Custom domain
  logo         String?
  favicon      String?
  primaryColor String     @default("#4F46E5")
  plan         TenantPlan @default(STARTER)
  isActive     Boolean    @default(true)
  
  // İlişkiler
  users        TenantUser[]
  articles     Article[]
  categories   Category[]
  // ... diğer ilişkiler
}

// Tenant-User ilişkisi
model TenantUser {
  tenantId  String
  userId    String
  role      TenantRole @default(EDITOR)
  
  @@unique([tenantId, userId])
}

// Tenant ayarları
model TenantSettings {
  tenantId              String  @unique
  siteName              String?
  tagline               String?
  aiGenerationEnabled   Boolean @default(false)
  // ... diğer ayarlar
}

// Abonelik bilgileri
model TenantSubscription {
  tenantId             String @unique
  stripeCustomerId     String?
  plan                 TenantPlan
  status               SubscriptionStatus
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
}

// Kullanım kayıtları
model UsageRecord {
  tenantId  String
  metric    String   // "ARTICLES", "STORAGE_MB", "AI_TOKENS"
  value     Int
  period    DateTime // Ay başı
  
  @@unique([tenantId, metric, period])
}
```

### Enum Tanımları

```prisma
enum TenantPlan {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum TenantRole {
  OWNER   // Tam yetki + fatura
  ADMIN   // Tam yetki
  EDITOR  // İçerik yönetimi
  AUTHOR  // Sadece kendi içerikleri
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}
```

---

## 🔌 API Endpoints

### Super Admin APIs (`/api/superadmin/`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/stats` | Platform istatistikleri |
| GET | `/tenants` | Tenant listesi |
| POST | `/tenants` | Yeni tenant oluştur |
| GET | `/tenants/[id]` | Tenant detayı |
| PATCH | `/tenants/[id]` | Tenant güncelle |
| DELETE | `/tenants/[id]` | Tenant sil |
| POST | `/tenants/onboard` | Onboarding wizard |
| GET/PATCH | `/tenants/[id]/theme` | Tenant teması |
| GET | `/users` | Kullanıcı listesi |
| PATCH | `/users` | Kullanıcı güncelle |
| DELETE | `/users` | Kullanıcı sil |
| GET | `/billing` | Billing overview |
| POST | `/billing` | Plan değiştir, trial uzat |
| GET | `/settings` | Platform ayarları |
| GET | `/system` | Sistem durumu |

### Admin APIs (`/api/admin/`) - Tenant-scoped

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/tenant` | Mevcut tenant bilgisi |
| GET | `/stats` | Dashboard istatistikleri |
| GET/POST | `/articles` | Makale CRUD |
| GET/POST | `/categories` | Kategori CRUD |
| GET/POST | `/authors` | Yazar CRUD |
| GET/POST | `/media` | Medya CRUD |
| GET/POST | `/comments` | Yorum CRUD |
| GET/POST | `/users` | Kullanıcı/davet yönetimi |
| GET/POST | `/billing` | Plan ve kullanım bilgisi |
| GET/PATCH | `/theme` | Tema ayarları |
| GET/PATCH | `/settings` | Tenant ayarları |

### Public APIs (`/api/tenant/`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/theme` | Tenant tema bilgisi |

---

## ⚠️ Eksik Kalan Kısımlar

### Phase 5: API & Entegrasyonlar (Yapılmadı)

- [ ] Public REST API (`/api/v1/`)
- [ ] API Key oluşturma ve yönetimi
- [ ] Rate limiting (plan bazlı)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Webhook sistemi
- [ ] SDK'lar (JavaScript, Python)

### Phase 6: Gelişmiş Özellikler (Yapılmadı)

- [ ] Tenant bazlı AI konfigürasyonu
- [ ] Multi-language desteği (i18n)
- [ ] Gelişmiş analytics dashboard
- [ ] A/B testing altyapısı
- [ ] CDN entegrasyonu

### Diğer Eksikler

- [ ] **Stripe Entegrasyonu:** Şu an mock data kullanılıyor, gerçek Stripe bağlantısı yok
- [ ] **Email Gönderimi:** Davet emailları henüz gönderilmiyor (sadece token oluşturuluyor)
- [ ] **Custom Domain SSL:** Wildcard SSL ve DNS yapılandırması
- [ ] **Public Site Şablonları:** Farklı site tasarımları
- [ ] **Row-Level Security:** PostgreSQL RLS henüz aktif değil
- [ ] **Audit Logging:** Kullanıcı aksiyonları loglanmıyor
- [ ] **GDPR Uyumluluğu:** Veri silme/export özellikleri

---

## 🚀 Canlıya Taşıma Rehberi

### 1. Ön Hazırlık

#### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"

# Stripe (Gerçek anahtarlar)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AWS
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="eu-central-1"
S3_BUCKET_NAME="..."

# AI Services
OPENAI_API_KEY="..."
AWS_BEDROCK_REGION="..."

# Email
EMAIL_PROVIDER="ses"
EMAIL_FROM="noreply@sonbirsoz-saas.com"
```

### 2. Veritabanı Migration

```bash
# 1. Production veritabanına bağlan
# 2. Migration çalıştır
npx prisma migrate deploy

# 3. Seed data (opsiyonel - sadece ilk kurulumda)
npx prisma db seed
```

### 3. DNS & SSL Yapılandırması

#### Subdomain Routing
```
*.sonbirsoz-saas.com → Platform IP/CNAME
```

#### Custom Domain Desteği
1. Cloudflare veya AWS Certificate Manager'da wildcard SSL
2. Her custom domain için CNAME kaydı:
   ```
   muzik.example.com → platform.sonbirsoz-saas.com
   ```

### 4. Stripe Kurulumu

1. Stripe Dashboard'da ürünler oluştur:
   - Starter Plan (₺499/ay)
   - Professional Plan (₺1.499/ay)
   - Enterprise Plan (özel fiyat)

2. Webhook endpoint ekle:
   ```
   https://your-domain.com/api/webhooks/stripe
   ```

3. Webhook events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### 5. Deployment Checklist

- [ ] Environment variables ayarlandı
- [ ] Database migration tamamlandı
- [ ] DNS kayıtları yapılandırıldı
- [ ] SSL sertifikaları aktif
- [ ] Stripe webhook'ları test edildi
- [ ] Super admin hesabı oluşturuldu
- [ ] İlk tenant (demo) oluşturuldu
- [ ] Email gönderimi test edildi
- [ ] Monitoring/alerting kuruldu

### 6. Post-Deployment

```bash
# Super admin oluştur
npx prisma db seed

# Veya manuel:
# 1. /superadmin-giris sayfasına git
# 2. superadmin@sonbirsoz-saas.com / admin123 ile giriş yap
# 3. Şifreyi değiştir!
```

---

## 👨‍💻 Geliştirici Notları

### Yeni Tenant Oluşturma (Programatik)

```typescript
import { prisma } from "@/lib/db";

const tenant = await prisma.tenant.create({
  data: {
    name: "Yeni Site",
    slug: "yeni-site",
    plan: "STARTER",
    settings: {
      create: {
        siteName: "Yeni Site",
        tagline: "Slogan",
      },
    },
    subscription: {
      create: {
        plan: "STARTER",
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    },
  },
});
```

### Kullanım Limiti Kontrolü

```typescript
import { withUsageLimit, canCreateArticle } from "@/lib/billing";

// API route'da kullanım
export async function POST(request: Request) {
  const tenantId = await getCurrentTenantId();
  
  // Yöntem 1: Middleware
  const limitCheck = await withUsageLimit(tenantId, "ARTICLES");
  if (limitCheck) return limitCheck; // 429 döner
  
  // Yöntem 2: Helper
  const { allowed, error } = await canCreateArticle(tenantId);
  if (!allowed) {
    return NextResponse.json({ error }, { status: 429 });
  }
  
  // Makale oluştur...
}
```

### Tema Uygulama

```typescript
import { TenantThemeProvider } from "@/lib/theme";

// Layout'ta kullan
export default function Layout({ children }) {
  return (
    <TenantThemeProvider>
      {children}
    </TenantThemeProvider>
  );
}
```

### Bilinen Sorunlar

1. **Hydration Warning:** Admin layout'ta minor hydration uyarısı var, fonksiyonelliği etkilemiyor
2. **ArticleEmbedding:** pgvector extension gerektiriyor, şu an devre dışı
3. **Import Service:** `importSonbirsozArticles` henüz tenant-aware değil

### Test Hesapları (Development)

| Rol | Email | Şifre |
|-----|-------|-------|
| Super Admin | superadmin@sonbirsoz-saas.com | admin123 |
| Demo Admin | admin@demo.sonbirsoz-saas.com | demo-password-123 |

---

## 📞 İletişim

Sorularınız için proje sahibiyle iletişime geçin.

---

*Bu dokümantasyon, SonBirSöz SaaS Platform projesinin mevcut durumunu yansıtmaktadır. Geliştirme devam ettikçe güncellenecektir.*
