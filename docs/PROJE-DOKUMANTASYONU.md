# SonBirSöz SaaS Platform - Proje Dokümantasyonu

**Versiyon:** 1.2  
**Son Güncelleme:** 6 Ağustos 2026  
**Proje Durumu:** Geliştirme Aşamasında (Phase 5 + Güvenlik Tamamlandı)  
**GitHub:** https://github.com/mert645/sonbirsoz-saas

---

## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [Mimari Yapı](#mimari-yapı)
3. [Tamamlanan Fazlar](#tamamlanan-fazlar)
4. [Güvenlik Altyapısı](#güvenlik-altyapısı)
5. [Dosya Yapısı](#dosya-yapısı)
6. [Veritabanı Şeması](#veritabanı-şeması)
7. [API Endpoints](#api-endpoints)
8. [Eksik Kalan Kısımlar](#eksik-kalan-kısımlar)
9. [Canlıya Taşıma Rehberi](#canlıya-taşıma-rehberi)
10. [Geliştirici Notları](#geliştirici-notları)

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
| Plan & Kullanım | `/admin/fatura` | Plan ve kullanım bilgisi |
| API Anahtarları | `/admin/api-keys` | API key yönetimi (Enterprise) |
| Tema | `/admin/tema` | Tema ayarları |
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

### Phase 5: API & Entegrasyonlar ✓

**Tamamlanan İşler:**
- [x] Public REST API (`/api/v1/`) - Enterprise plan için
- [x] API Key oluşturma ve yönetimi
- [x] API Key doğrulama middleware
- [x] Plan bazlı rate limiting
- [x] Webhook sistemi (article.published, comment.created, vb.)
- [x] Admin panelde API Key yönetim UI

**API Key Sistemi:**
- Format: `sbs_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Scope bazlı yetkilendirme (articles:read, articles:write, vb.)
- Sadece Enterprise plan için aktif

**Public API Endpoints (`/api/v1/`):**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/articles` | Makale listesi |
| POST | `/articles` | Makale oluştur |
| GET | `/articles/[id]` | Makale detayı |
| PATCH | `/articles/[id]` | Makale güncelle |
| DELETE | `/articles/[id]` | Makale sil |
| GET | `/categories` | Kategori listesi |
| POST | `/categories` | Kategori oluştur |
| GET | `/authors` | Yazar listesi |
| POST | `/authors` | Yazar oluştur |
| GET | `/media` | Medya listesi |
| POST | `/media` | Medya kaydet |

**Webhook Events:**
- `article.created` - Makale oluşturulduğunda
- `article.updated` - Makale güncellendiğinde
- `article.published` - Makale yayınlandığında
- `article.deleted` - Makale silindiğinde
- `comment.created` - Yorum yapıldığında
- `comment.approved` - Yorum onaylandığında
- `media.uploaded` - Medya yüklendiğinde

**Rate Limiting:**
| Plan | Limit |
|------|-------|
| Enterprise | 1000 istek/dakika |
| Professional | 100 istek/dakika |
| Starter | 10 istek/dakika |

**Önemli Dosyalar:**
```
src/lib/api/keys.ts           # API key oluşturma ve doğrulama
src/lib/api/middleware.ts     # API doğrulama middleware
src/lib/api/rate-limit.ts     # Rate limiting
src/lib/api/webhooks.ts       # Webhook tetikleme sistemi
src/app/api/v1/               # Public REST API endpoints
src/app/(admin)/admin/api-keys/  # API Key yönetim UI
```

---

## 🔒 Güvenlik Altyapısı

### Genel Bakış

Platform, kapsamlı bir güvenlik altyapısı ile korunmaktadır. Tüm güvenlik modülleri `src/lib/security/` altında organize edilmiştir.

### 1. Input Sanitization & Validation

**Dosya:** `src/lib/security/sanitize.ts`

| Fonksiyon | Açıklama |
|-----------|----------|
| `escapeHtml()` | HTML özel karakterlerini escape eder |
| `stripHtml()` | HTML tag'lerini tamamen kaldırır |
| `sanitizeInput()` | Tehlikeli karakterleri temizler |
| `containsSqlInjection()` | SQL injection pattern'lerini tespit eder |
| `containsXss()` | XSS pattern'lerini tespit eder |
| `containsPathTraversal()` | Path traversal saldırılarını tespit eder |
| `isValidEmail()` | Email format doğrulama |
| `isValidUrl()` | URL format doğrulama |
| `isValidSlug()` | Slug format doğrulama |
| `validateAndSanitize()` | Tüm kontrolleri tek seferde uygular |
| `sanitizeObject()` | Object içindeki tüm string'leri temizler |

**Kullanım Örneği:**
```typescript
import { validateAndSanitize, containsXss } from "@/lib/security/sanitize";

// Tek değer kontrolü
if (containsXss(userInput)) {
  return NextResponse.json({ error: "Geçersiz içerik" }, { status: 400 });
}

// Kapsamlı kontrol ve temizleme
const { valid, sanitized, error } = validateAndSanitize(userInput, {
  maxLength: 1000,
  checkSql: true,
  checkXss: true,
});
```

---

### 2. Security Headers

**Dosya:** `src/lib/security/headers.ts`

Tüm response'lara otomatik olarak eklenen güvenlik header'ları:

| Header | Değer | Açıklama |
|--------|-------|----------|
| `X-XSS-Protection` | `1; mode=block` | Tarayıcı XSS filtresi |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking koruması |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing koruması |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer bilgisi kontrolü |
| `Permissions-Policy` | `camera=(), microphone=()...` | Tarayıcı API'leri kısıtlama |
| `Strict-Transport-Security` | `max-age=31536000...` | HSTS (production) |

**CSRF Koruması:**
- Origin header doğrulama
- Referer header doğrulama
- State-changing request'ler için otomatik kontrol

---

### 3. Authentication & Authorization

**Dosya:** `src/lib/security/auth.ts`

| Fonksiyon | Açıklama |
|-----------|----------|
| `getAuthenticatedUser()` | Session'dan kullanıcı bilgisi alır |
| `getAuthContext()` | User + Tenant context döner |
| `hasRole()` | Belirli role sahip mi kontrol eder |
| `hasMinimumRole()` | Role hierarchy kontrolü |
| `requireAuth()` | API route'lar için auth middleware |
| `requireRole()` | Belirli roller için auth |
| `requireAdmin()` | Admin rolü gerektirir |
| `requireSuperAdmin()` | Super Admin rolü gerektirir |
| `requireTenantAccess()` | Tenant erişim kontrolü |
| `requireResourceAccess()` | Resource ownership kontrolü |
| `validateSession()` | Session geçerliliğini doğrular |

**Role Hierarchy:**
```
SUPER_ADMIN (5) > ADMIN (4) > EDITOR (3) > AUTHOR (2) > USER (1)
```

**Kullanım Örneği:**
```typescript
import { requireAdmin, requireTenantAccess } from "@/lib/security/auth";

export async function POST(request: NextRequest) {
  // Admin rolü gerektirir
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  
  // auth.user ve auth.tenantId kullanılabilir
}
```

---

### 4. Audit Logging

**Dosya:** `src/lib/security/audit.ts`

Tüm kritik aksiyonlar loglanır:

| Action | Severity | Açıklama |
|--------|----------|----------|
| `LOGIN` | INFO | Başarılı giriş |
| `LOGIN_FAILED` | WARNING | Başarısız giriş denemesi |
| `LOGOUT` | INFO | Çıkış |
| `PASSWORD_CHANGE` | INFO | Şifre değişikliği |
| `USER_CREATE/UPDATE/DELETE` | INFO/WARNING | Kullanıcı işlemleri |
| `TENANT_CREATE/UPDATE/DELETE` | INFO/WARNING | Tenant işlemleri |
| `ARTICLE_CREATE/UPDATE/DELETE` | INFO | Makale işlemleri |
| `API_KEY_CREATE/DELETE` | WARNING | API key işlemleri |
| `SUSPICIOUS_ACTIVITY` | CRITICAL | Şüpheli aktivite |
| `RATE_LIMIT_EXCEEDED` | WARNING | Rate limit aşımı |

**Hassas Veri Maskeleme:**
Log'larda şu alanlar otomatik olarak `[REDACTED]` ile maskelenir:
- password, passwordHash
- token, secret, apiKey
- authorization, cookie, session
- creditCard, ssn, cvv

**Kullanım Örneği:**
```typescript
import { createAuditLog, auditLogin } from "@/lib/security/audit";

// Login audit
await auditLogin(email, true, ipAddress, userAgent, userId);

// Genel audit
await createAuditLog({
  action: "ARTICLE_CREATE",
  severity: "INFO",
  userId: user.id,
  tenantId: tenant.id,
  resourceType: "article",
  resourceId: article.id,
  success: true,
});
```

---

### 5. Password Policy

**Dosya:** `src/lib/security/password.ts`

**Şifre Gereksinimleri:**
| Kural | Değer |
|-------|-------|
| Minimum uzunluk | 8 karakter |
| Maximum uzunluk | 128 karakter |
| Büyük harf | Zorunlu |
| Küçük harf | Zorunlu |
| Rakam | Zorunlu |
| Özel karakter | Zorunlu (!@#$%^&* vb.) |
| Yaygın şifre kontrolü | Aktif |
| Şifre geçmişi | Son 5 şifre tekrar kullanılamaz |

**Şifre Gücü Hesaplama:**
- `weak`: Temel gereksinimleri karşılamıyor
- `medium`: Gereksinimleri karşılıyor
- `strong`: 12+ karakter ve tüm gereksinimler

**Kullanım Örneği:**
```typescript
import { validatePassword, hashPassword } from "@/lib/security/password";

const { valid, errors, strength } = validatePassword(newPassword);
if (!valid) {
  return NextResponse.json({ errors }, { status: 400 });
}

const hash = await hashPassword(newPassword);
```

---

### 6. Account Lockout

**Dosya:** `src/lib/auth.ts`

| Ayar | Değer |
|------|-------|
| Max başarısız deneme | 5 |
| Kilit süresi | 15 dakika |
| Timing attack koruması | Aktif |

**Çalışma Mantığı:**
1. Her başarısız login denemesi sayılır
2. 5 başarısız denemede hesap 15 dakika kilitlenir
3. Başarılı login'de sayaç sıfırlanır
4. Kilit süresi dolunca otomatik açılır

**Timing Attack Koruması:**
Kullanıcı bulunamasa bile bcrypt karşılaştırması yapılır, böylece response süresi aynı kalır.

---

### 7. Rate Limiting

**Dosya:** `src/proxy.ts`

| Endpoint | Limit | Açıklama |
|----------|-------|----------|
| `/api/auth/callback/credentials` | 10/dk | Login brute-force koruması |
| `/api/newsletter` | 5/dk | Form abuse koruması |
| `/api/search` | 60/dk | Arama floodu |
| `/api/ai-search` | 10/dk | AI maliyet kontrolü |
| `/api/admin/*` | 100/dk | Admin API'ler |
| `/api/superadmin/*` | 50/dk | Super Admin API'ler |
| `/api/v1/*` | 200/dk | Public API |
| `/api/invite/*` | 10/dk | Davet sistemi |

---

### 8. Veritabanı Güvenlik Modelleri

```prisma
// Audit Log
model AuditLog {
  id           String   @id @default(cuid())
  action       String   // LOGIN, ARTICLE_CREATE, etc.
  severity     String   // INFO, WARNING, ERROR, CRITICAL
  userId       String?
  userEmail    String?
  tenantId     String?
  resourceType String?
  resourceId   String?
  ipAddress    String?
  userAgent    String?
  details      Json
  success      Boolean
  createdAt    DateTime @default(now())
}

// Password History
model PasswordHistory {
  id           String   @id @default(cuid())
  userId       String
  passwordHash String
  createdAt    DateTime @default(now())
}

// User Security Fields
model User {
  // ... diğer alanlar
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  lastLoginAt         DateTime?
  lastLoginIp         String?
  passwordChangedAt   DateTime?
}
```

---

### Güvenlik Dosya Yapısı

```
src/lib/security/
├── index.ts          # Tüm export'lar
├── sanitize.ts       # Input sanitization
├── headers.ts        # Security headers & CSRF
├── auth.ts           # Authentication utilities
├── audit.ts          # Audit logging
└── password.ts       # Password policy
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
│   │   │   │   ├── api-keys/      # YENİ (Phase 5)
│   │   │   │   ├── webhooks/      # YENİ (Phase 5)
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
│   │   ├── api/v1/           # Public REST API (Phase 5)
│   │   │   ├── articles/
│   │   │   ├── categories/
│   │   │   ├── authors/
│   │   │   └── media/
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
│   │   ├── api/              # API utilities (Phase 5)
│   │   │   ├── keys.ts
│   │   │   ├── middleware.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── webhooks.ts
│   │   ├── security/         # Güvenlik modülleri (YENİ)
│   │   │   ├── index.ts
│   │   │   ├── sanitize.ts   # Input sanitization
│   │   │   ├── headers.ts    # Security headers & CSRF
│   │   │   ├── auth.ts       # Auth utilities
│   │   │   ├── audit.ts      # Audit logging
│   │   │   └── password.ts   # Password policy
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

// API Anahtarları (Phase 5)
model ApiKey {
  id          String    @id @default(cuid())
  tenantId    String
  name        String    // "Mobile App", "WordPress Plugin"
  key         String    @unique // sbs_live_xxx
  keyPrefix   String    // İlk 13 karakter
  scopes      String[]  // ["articles:read", "articles:write"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
}

// Webhook Tanımları (Phase 5)
model Webhook {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  url         String
  events      String[] // ["article.published", "comment.created"]
  secret      String   // HMAC imzalama için
  isActive    Boolean  @default(true)
  failCount   Int      @default(0)
}

// Webhook Gönderim Geçmişi (Phase 5)
model WebhookDelivery {
  id           String   @id @default(cuid())
  webhookId    String
  event        String
  payload      Json
  statusCode   Int?
  success      Boolean  @default(false)
  duration     Int?     // ms
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

### Public REST API (`/api/v1/`) - Enterprise Plan

> **Not:** Bu API'ye erişim için API Key gereklidir. Header: `Authorization: Bearer sbs_live_xxx`

| Method | Endpoint | Scope | Açıklama |
|--------|----------|-------|----------|
| GET | `/articles` | articles:read | Makale listesi |
| POST | `/articles` | articles:write | Makale oluştur |
| GET | `/articles/[id]` | articles:read | Makale detayı |
| PATCH | `/articles/[id]` | articles:write | Makale güncelle |
| DELETE | `/articles/[id]` | articles:delete | Makale sil |
| GET | `/categories` | categories:read | Kategori listesi |
| POST | `/categories` | categories:write | Kategori oluştur |
| GET | `/authors` | authors:read | Yazar listesi |
| POST | `/authors` | authors:write | Yazar oluştur |
| GET | `/media` | media:read | Medya listesi |
| POST | `/media` | media:write | Medya kaydet |

---

## ⚠️ Eksik Kalan Kısımlar

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
- [ ] **GDPR Uyumluluğu:** Veri silme/export özellikleri
- [ ] **API Documentation:** OpenAPI/Swagger dokümantasyonu

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

### API Kullanım Örneği (Phase 5)

```bash
# API Key ile makale listesi çekme
curl -X GET "https://api.sonbirsoz-saas.com/api/v1/articles?page=1&limit=10" \
  -H "Authorization: Bearer sbs_live_xxxxxxxxxxxxxxxxxxxx"

# Yeni makale oluşturma
curl -X POST "https://api.sonbirsoz-saas.com/api/v1/articles" \
  -H "Authorization: Bearer sbs_live_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Yeni Makale",
    "content": "Makale içeriği...",
    "categoryId": "category_id",
    "status": "DRAFT"
  }'
```

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
