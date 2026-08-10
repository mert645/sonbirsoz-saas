# SonBirSöz SaaS Platform - Proje Dokümantasyonu

**Versiyon:** 2.0  
**Son Güncelleme:** 10 Ağustos 2026  
**Proje Durumu:** Production-Ready (Tüm Fazlar Tamamlandı)  
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
8. [Canlıya Taşıma Rehberi (AWS Amplify)](#canlıya-taşıma-rehberi-aws-amplify)
9. [Tenant Routing & Multi-Domain](#tenant-routing--multi-domain)
10. [AI Görsel Üretimi](#ai-görsel-üretimi)
11. [Geliştirici Notları](#geliştirici-notları)
12. [Eksik Kalan Kısımlar](#eksik-kalan-kısımlar)

---

## 🎯 Proje Özeti

### Amaç
Mevcut **Son Bir Söz** haber sitesi admin panelini, farklı müşterilere satılabilecek **multi-tenant SaaS platformuna** dönüştürmek.

### Hedef Kullanım Senaryoları
- `sonbirsozmuzik.com` - Müzik haberleri sitesi
- `sondakikatarih.com` - Tarih haberleri sitesi
- `sonbirsozspor.com` - Spor haberleri sitesi
- `demo.sonbirsoz-saas.com` - Demo tenant
- Farklı firmalar için white-label çözümler

### Teknoloji Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 |
| Auth | NextAuth.js |
| Hosting | AWS Amplify (SSR) |
| AI | AWS Bedrock, OpenAI, SSM Content API |

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
│  - Tenant identification (subdomain/header/hostname)         │
│  - Authentication check                                      │
│  - Role-based access control                                 │
│  - Rate limiting                                             │
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
│   ├── v1/            # Public REST API (Enterprise)
│   └── tenant/        # Public tenant APIs
└── superadmin-giris/  # Super admin login (route group dışında)
```

---

## ✅ Tamamlanan Fazlar

### Phase 1: Multi-Tenancy Altyapısı ✓
- [x] Tenant, TenantUser, TenantSettings, TenantSubscription modelleri
- [x] Tüm içerik modellerine `tenantId` eklendi
- [x] Tenant context provider (React)
- [x] Subdomain/header/hostname bazlı tenant routing
- [x] API route'larında tenant izolasyonu

### Phase 2: Onboarding & Tenant Yönetimi ✓
- [x] Super Admin paneli (dashboard, tenants, users, settings, system)
- [x] Tenant CRUD API'leri
- [x] Tenant onboarding wizard
- [x] Kullanıcı davet sistemi
- [x] Tenant ayarları sayfası

### Phase 3: Billing & Subscription ✓
- [x] Plan limitleri (Starter, Professional, Enterprise)
- [x] Kullanım takibi sistemi
- [x] Abonelik yönetimi API'leri
- [x] Super Admin billing dashboard

### Phase 4: White-Label & Theming ✓
- [x] CSS variables tabanlı dinamik tema sistemi
- [x] 15 hazır tema preseti
- [x] Tenant logo/favicon dinamik yükleme
- [x] Admin panelde tema ayarları

### Phase 5: API & Entegrasyonlar ✓
- [x] Public REST API (`/api/v1/`)
- [x] API Key oluşturma ve yönetimi
- [x] Webhook sistemi
- [x] Rate limiting

### Ek Tamamlanan Özellikler ✓
- [x] Güvenlik altyapısı (sanitization, audit logging, password policy)
- [x] GDPR uyumluluğu (veri export/silme)
- [x] Email şablonları (AWS SES)
- [x] i18n desteği (TR/EN)
- [x] API dokümantasyonu (OpenAPI/Swagger)
- [x] Public site şablonu

---

## 🔒 Güvenlik Altyapısı

### Güvenlik Modülleri (`src/lib/security/`)

| Modül | Dosya | Açıklama |
|-------|-------|----------|
| Input Sanitization | `sanitize.ts` | XSS, SQL injection, path traversal koruması |
| Security Headers | `headers.ts` | CSRF, clickjacking, MIME sniffing koruması |
| Authentication | `auth.ts` | Role-based access control |
| Audit Logging | `audit.ts` | Kritik aksiyonların loglanması |
| Password Policy | `password.ts` | Güçlü şifre gereksinimleri |

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Login | 10/dk |
| Newsletter | 5/dk |
| Search | 60/dk |
| AI Search | 10/dk |
| Admin API | 100/dk |
| Public API | 200/dk |

---

## 📁 Dosya Yapısı

```
sonbirsoz-saas/
├── amplify.yml              # AWS Amplify build config
├── prisma/
│   ├── schema.prisma        # Veritabanı şeması
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── (admin)/         # Tenant admin paneli
│   │   ├── (superadmin)/    # Platform yönetimi
│   │   ├── (public)/        # Herkese açık sayfalar
│   │   ├── api/             # API endpoints
│   │   │   ├── admin/       # Tenant-scoped APIs
│   │   │   ├── superadmin/  # Platform APIs
│   │   │   ├── v1/          # Public REST API
│   │   │   └── ai/          # AI endpoints
│   │   └── api-docs/        # Swagger UI
│   ├── lib/
│   │   ├── tenant/          # Tenant utilities
│   │   ├── billing/         # Billing utilities
│   │   ├── theme/           # Theme utilities
│   │   ├── api/             # API utilities
│   │   ├── security/        # Security modules
│   │   ├── ai/              # AI utilities
│   │   └── i18n/            # Internationalization
│   ├── components/          # React components
│   └── proxy.ts             # Routing middleware
├── docs/
│   ├── PROJE-DOKUMANTASYONU.md
│   └── MANUEL-TEST-REHBERI.md
└── scripts/                 # Utility scripts
```

---

## 🚀 Canlıya Taşıma Rehberi (AWS Amplify)

### Adım 1: AWS Console'a Giriş
1. https://console.aws.amazon.com adresine gidin
2. AWS hesabınızla giriş yapın
3. Arama çubuğuna "Amplify" yazın ve **AWS Amplify** servisini seçin

### Adım 2: Yeni Uygulama Oluşturma
1. **"Create new app"** butonuna tıklayın
2. **"Host web app"** seçeneğini seçin
3. **GitHub** seçin ve "Continue" tıklayın
4. GitHub hesabınızı bağlayın (zaten bağlıysa atlanır)
5. Repository olarak **mert645/sonbirsoz-saas** seçin
6. Branch olarak **master** seçin

### Adım 3: Build Ayarları
Amplify otomatik olarak `amplify.yml` dosyasını algılayacak:
- **Framework**: Next.js - SSR
- **Build settings**: Use amplify.yml from repository

### Adım 4: Environment Variables (ÖNEMLİ!)

"Advanced settings" → "Environment variables" bölümünde şunları ekleyin:

#### Zorunlu Değişkenler
```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_jAiEvg5PDRb4@ep-frosty-bird-agyuq43p-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Auth
NEXTAUTH_SECRET=<openssl rand -base64 48 ile üretin>
NEXTAUTH_URL=https://<amplify-domain>.amplifyapp.com

# Seed Admin (ilk kurulumda oluşturulacak)
SEED_ADMIN_EMAIL=admin@sonbirsoz-saas.com
SEED_ADMIN_PASSWORD=<güçlü-bir-şifre>
SEED_ADMIN_NAME=Admin

# Site
NEXT_PUBLIC_SITE_URL=https://<amplify-domain>.amplifyapp.com
NEXT_PUBLIC_SITE_NAME=Son Bir Söz SaaS

# Multi-Tenancy
BASE_DOMAIN=<amplify-domain>.amplifyapp.com

# Cron Secret
CRON_SECRET=<openssl rand -hex 24 ile üretin>
```

#### AI Görsel Üretimi (Opsiyonel - en az biri gerekli)
```env
# Seçenek 1: SSM Content API (Önerilen)
SSM_CONTENT_API_URL=https://i3ob0ck5m2.execute-api.eu-central-1.amazonaws.com/prod
SSM_CONTENT_API_KEY=<api-key>
SSM_CDN_URL=https://cdn.aiartists.studio

# Seçenek 2: OpenAI
OPENAI_API_KEY=<openai-api-key>

# Seçenek 3: AWS Bedrock
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
BEDROCK_IMAGE_REGION=us-west-2
BEDROCK_MODEL_ID=eu.anthropic.claude-sonnet-4-20250514-v1:0
```

#### Email Gönderimi (Opsiyonel)
```env
SES_REGION=eu-central-1
SES_FROM_EMAIL=noreply@sonbirsoz-saas.com
```

### Adım 5: Deploy
1. **"Save and deploy"** tıklayın
2. Build işlemi 5-10 dakika sürecek
3. Tamamlandığında URL verilecek: `https://master.xxxxx.amplifyapp.com`

### Adım 6: İlk Kurulum Sonrası
1. Super Admin girişi: `https://<domain>/superadmin-giris`
   - Email: `superadmin@sonbirsoz-saas.com`
   - Şifre: `admin123` (hemen değiştirin!)

2. İlk tenant oluşturma:
   - Super Admin → Tenants → "Yeni Tenant Ekle"

### Adım 7: Custom Domain (Opsiyonel)
1. Amplify Console → Domain management
2. "Add domain" tıklayın
3. Domain'inizi ekleyin (örn: `sonbirsoz-saas.com`)
4. DNS ayarlarını yapın:
   ```
   CNAME: www → <amplify-domain>.amplifyapp.com
   CNAME: *.sonbirsoz-saas.com → <amplify-domain>.amplifyapp.com
   ```

---

## 🌐 Tenant Routing & Multi-Domain

### Routing Mantığı

Sistem şu sırayla tenant'ı belirler:

1. **Custom Domain**: `muzik.example.com` → `muzik` tenant
2. **Subdomain**: `muzik.sonbirsoz-saas.com` → `muzik` tenant
3. **Hostname**: `muzik.localhost` → `muzik` tenant (development)
4. **Header**: `x-tenant-slug: muzik` → `muzik` tenant
5. **Fallback**: `DEV_TENANT_SLUG` env variable

### Local Development için Tenant Test

1. `C:\Windows\System32\drivers\etc\hosts` dosyasına ekleyin:
   ```
   127.0.0.1 muzik.localhost
   127.0.0.1 spor.localhost
   ```

2. Tarayıcıda açın:
   - `http://muzik.localhost:3000` → Müzik tenant
   - `http://spor.localhost:3000` → Spor tenant

### Yeni Tenant Oluşturma

1. **Super Admin Panel üzerinden:**
   - `/superadmin/tenants` → "Yeni Tenant Ekle"

2. **Script ile:**
   ```bash
   npx tsx scripts/create-muzik-tenant.ts
   ```

3. **API ile:**
   ```bash
   curl -X POST "https://domain/api/superadmin/tenants/onboard" \
     -H "Content-Type: application/json" \
     -d '{
       "tenantName": "Son Bir Söz Müzik",
       "tenantSlug": "muzik",
       "adminEmail": "admin@muzik.com",
       "adminPassword": "güçlü-şifre",
       "adminName": "Müzik Admin",
       "plan": "PROFESSIONAL"
     }'
   ```

---

## 🎨 AI Görsel Üretimi

### Sağlayıcı Zinciri (Öncelik Sırası)

1. **SSM Content API** (CDN URL döner - tercih edilen)
   - OpenAI gpt-image-1
   - Stability SD3.5
   - Flux Pro
   - Vertex Imagen-4

2. **OpenAI gpt-image-1** (base64 döner)

3. **AWS Bedrock Stability** (base64 döner)
   - stability.stable-image-ultra-v1:1
   - stability.sd3-5-large-v1:0
   - stability.stable-image-core-v1:1

### Kullanım

```typescript
// API endpoint
POST /api/ai/generate-image
{
  "title": "Haber başlığı",
  "category": "muzik",
  "purpose": "cover" // cover, social_square, social_story, thumbnail
}

// Client-side
import { generateImageViaApi } from "@/lib/ai/generate-image-client";

const result = await generateImageViaApi({
  title: "Haber başlığı",
  category: "muzik",
  purpose: "cover"
});
// result.imageUrl → Görsel URL'i
```

### Yapılandırma Kontrolü

API anahtarı yoksa açıklayıcı hata mesajı döner:
```json
{
  "error": "Görsel üretimi yapılandırılmamış",
  "details": "AI görsel üretimi için SSM_CONTENT_API_KEY, OPENAI_API_KEY veya AWS Bedrock kimlik bilgilerinden en az biri .env dosyasında tanımlanmalıdır.",
  "missingConfig": true
}
```

---

## 👨‍💻 Geliştirici Notları

### Test Hesapları (Development)

| Rol | Email | Şifre |
|-----|-------|-------|
| Super Admin | superadmin@sonbirsoz-saas.com | admin123 |
| Demo Admin | admin@demo.sonbirsoz-saas.com | demo-password-123 |

### Önemli Komutlar

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Database
npx prisma generate      # Client oluştur
npx prisma db push       # Schema sync
npx prisma db seed       # Seed data
npx prisma studio        # DB GUI

# Yeni tenant oluştur
npx tsx scripts/create-muzik-tenant.ts
```

### API Kullanım Örneği (Enterprise Plan)

```bash
# API Key ile makale listesi
curl -X GET "https://domain/api/v1/articles?page=1&limit=10" \
  -H "Authorization: Bearer sbs_live_xxxxxxxxxxxxxxxxxxxx"

# Yeni makale oluşturma
curl -X POST "https://domain/api/v1/articles" \
  -H "Authorization: Bearer sbs_live_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Yeni Makale",
    "content": "Makale içeriği...",
    "categoryId": "category_id",
    "status": "DRAFT"
  }'
```

---

## ⚠️ Eksik Kalan Kısımlar

### Ödeme Gerektiren (Yapılmadı)
- [ ] **Stripe Entegrasyonu:** Gerçek ödeme altyapısı
- [ ] **Custom Domain SSL:** Wildcard SSL sertifikası
- [ ] **CDN Entegrasyonu:** CloudFront veya benzeri

### Gelecek Geliştirmeler
- [ ] Tenant bazlı AI konfigürasyonu
- [ ] Gelişmiş analytics dashboard
- [ ] A/B testing altyapısı
- [ ] Mobile app (React Native)

### Bilinen Sorunlar
1. **ArticleEmbedding:** pgvector extension gerektiriyor, şu an devre dışı
2. **Import Service:** `importSonbirsozArticles` henüz tenant-aware değil

---

## 📞 İletişim

Sorularınız için proje sahibiyle iletişime geçin.

---

*Bu dokümantasyon, SonBirSöz SaaS Platform projesinin güncel durumunu yansıtmaktadır.*
*Son güncelleme: 10 Ağustos 2026*
