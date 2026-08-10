# SonBirSöz SaaS - Manuel Test Rehberi

Bu döküman, SonBirSöz SaaS platformunda yapılan geliştirmelerin manuel olarak test edilmesi için hazırlanmıştır.

**Son Güncelleme:** 10 Ağustos 2026  
**Versiyon:** 2.0

---

## İçindekiler

1. [Ön Hazırlık](#1-ön-hazırlık)
2. [Production Modda Test](#2-production-modda-test)
3. [Multi-Tenant Routing Testi](#3-multi-tenant-routing-testi)
4. [Güvenlik Testleri](#4-güvenlik-testleri)
5. [API Dokümantasyonu Testi](#5-api-dokümantasyonu-testi)
6. [GDPR Uyumluluk Testleri](#6-gdpr-uyumluluk-testleri)
7. [Email Şablonları Testi](#7-email-şablonları-testi)
8. [Çoklu Dil (i18n) Testi](#8-çoklu-dil-i18n-testi)
9. [AI Görsel Üretimi Testi](#9-ai-görsel-üretimi-testi)
10. [Public Site Testi](#10-public-site-testi)
11. [Admin Panel Testleri](#11-admin-panel-testleri)
12. [Super Admin Panel Testleri](#12-super-admin-panel-testleri)
13. [AWS Amplify Deployment Testi](#13-aws-amplify-deployment-testi)

---

## 1. Ön Hazırlık

### 1.1 Gereksinimler

- Node.js 18+ yüklü olmalı
- PostgreSQL veritabanı bağlantısı (Neon)
- `.env.local` dosyası yapılandırılmış olmalı

### 1.2 Projeyi Başlatma (Development)

```bash
# Proje klasörüne git
cd D:\WORKAREA\PROJECTS\sonbirsoz-saas

# Bağımlılıkları yükle
npm install

# Prisma client oluştur
npx prisma generate

# Veritabanını güncelle (gerekirse)
npx prisma db push

# Seed verilerini yükle (ilk kurulumda)
npx prisma db seed

# Development sunucusunu başlat
npm run dev
```

### 1.3 Test Hesapları

| Hesap Türü | E-posta | Şifre | Erişim |
|------------|---------|-------|--------|
| Super Admin | superadmin@sonbirsoz-saas.com | admin123 | Tüm platform |
| Demo Admin | admin@demo.sonbirsoz-saas.com | demo-password-123 | Demo tenant |
| Müzik Admin | admin@muzik.sonbirsoz-saas.com | muzik-admin-123 | Müzik tenant |

### 1.4 Hosts Dosyası Yapılandırması (Windows)

Multi-tenant routing testi için `C:\Windows\System32\drivers\etc\hosts` dosyasına ekleyin:

```
127.0.0.1 demo.localhost
127.0.0.1 muzik.localhost
127.0.0.1 spor.localhost
```

---

## 2. Production Modda Test

### 2.1 Production Build Oluşturma

```bash
# Proje klasörüne git
cd D:\WORKAREA\PROJECTS\sonbirsoz-saas

# Önce mevcut node işlemlerini durdur (Windows)
taskkill /F /IM node.exe

# Production build oluştur
npm run build
```

**Beklenen Çıktı:**
```
✓ Compiled successfully
✓ Generating static pages (93/93)
✓ Finalizing page optimization
```

### 2.2 Production Sunucusunu Başlatma

```bash
npm run start
```

**Beklenen Çıktı:**
```
▲ Next.js 16.3.0
- Local:         http://localhost:3000
✓ Ready in 196ms
```

### 2.3 Production Hızlı Kontrol Listesi

| Sayfa | URL | Beklenen Durum |
|-------|-----|----------------|
| Ana Sayfa | http://localhost:3000 | ✅ Yüklenmeli |
| Super Admin Giriş | http://localhost:3000/superadmin-giris | ✅ Form görünmeli |
| Admin Giriş | http://localhost:3000/admin/giris | ✅ Form görünmeli |
| API Docs | http://localhost:3000/api-docs | ✅ Swagger UI görünmeli |
| Tenant Debug | http://localhost:3000/api/debug/tenant | ✅ JSON yanıt |

---

## 3. Multi-Tenant Routing Testi

### 3.1 Subdomain Routing Testi

**Amaç:** Farklı subdomain'lerin farklı tenant'lara yönlendirildiğini test etmek.

**Adımlar:**

1. Hosts dosyasını yapılandırdığınızdan emin olun (bkz. 1.4)
2. Sunucuyu başlatın: `npm run dev`
3. Farklı URL'leri test edin:

| URL | Beklenen Tenant |
|-----|-----------------|
| http://demo.localhost:3000 | Demo tenant |
| http://muzik.localhost:3000 | Müzik tenant |
| http://localhost:3000 | Varsayılan (DEV_TENANT_SLUG) |

**Doğrulama:**
```bash
# Tenant debug endpoint'i ile kontrol
curl http://muzik.localhost:3000/api/debug/tenant
```

**Beklenen Yanıt:**
```json
{
  "tenant": {
    "id": "...",
    "name": "Son Bir Söz Müzik",
    "slug": "muzik"
  }
}
```

### 3.2 Custom Domain Testi (Production)

Production ortamında custom domain routing testi:

1. DNS'te CNAME kaydı oluşturun: `muzik.example.com → platform.amplifyapp.com`
2. Tenant ayarlarında domain'i kaydedin
3. `https://muzik.example.com` adresini ziyaret edin

---

## 4. Güvenlik Testleri

### 4.1 Hesap Kilitleme Testi

**Amaç:** 5 başarısız giriş denemesinden sonra hesabın kilitlenmesini test etmek.

**Adımlar:**

1. `http://localhost:3000/superadmin-giris` adresine git
2. E-posta: `superadmin@sonbirsoz-saas.com`
3. **Yanlış** şifre gir (örn: `yanlis123`)
4. Bu işlemi **5 kez** tekrarla

**Beklenen Sonuç:**
- 5. denemeden sonra "Hesabınız geçici olarak kilitlendi" mesajı
- 15 dakika boyunca doğru şifre ile bile giriş yapılamamalı

**Kilidi Açma (Test için):**
```sql
UPDATE users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL 
WHERE email = 'superadmin@sonbirsoz-saas.com';
```

### 4.2 Rate Limiting Testi

**Adımlar:**

1. Tarayıcı Console'unda (F12) şu kodu çalıştır:

```javascript
for(let i = 0; i < 15; i++) {
  fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' })
  }).then(r => console.log(`İstek ${i+1}: ${r.status}`));
}
```

**Beklenen Sonuç:**
- İlk 10 istek normal yanıt
- 11. istekten itibaren `429 Too Many Requests`

### 4.3 XSS Koruması Testi

**Adımlar:**

1. Admin paneline giriş yap
2. Kategoriler sayfasına git: `/admin/kategoriler`
3. Yeni kategori ekle
4. Kategori adı: `<script>alert('XSS')</script>`
5. Kaydet

**Beklenen Sonuç:**
- "Geçersiz karakterler tespit edildi" hatası
- Kategori kaydedilmemeli

### 4.4 Güvenlik Header'ları Testi

**Adımlar:**

1. F12 → Network sekmesi
2. Sayfayı yenile
3. Response Headers kontrol et

**Beklenen Header'lar:**
```
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 5. API Dokümantasyonu Testi

### 5.1 Swagger UI Erişimi

**URL:** `http://localhost:3000/api-docs`

**Beklenen Sonuç:**
- Swagger UI arayüzü görülmeli
- Endpoint kategorileri: Articles, Categories, Authors, Media, Home

### 5.2 OpenAPI Spec Erişimi

**URL:** `http://localhost:3000/api/docs/openapi.json`

**Beklenen Sonuç:**
- JSON formatında OpenAPI 3.0.3 spesifikasyonu

### 5.3 API Endpoint Testi

**Adımlar:**

1. Swagger UI'da "Articles" → `GET /articles`
2. "Try it out" → "Execute"

**Beklenen Sonuç:**
- `401 Unauthorized` (API key olmadan)

**API Key ile Test:**
```bash
curl -X GET "http://localhost:3000/api/v1/articles" \
  -H "Authorization: Bearer sbs_live_xxxxxxxxxxxx"
```

---

## 6. GDPR Uyumluluk Testleri

### 6.1 Kullanıcı Verisi Export

**Adımlar:**

1. Admin paneline giriş yap
2. Console'da çalıştır:

```javascript
fetch('/api/admin/gdpr/export')
  .then(r => r.json())
  .then(data => console.log(data));
```

**Beklenen Sonuç:**
```json
{
  "user": { ... },
  "tenants": [ ... ],
  "articles": [ ... ],
  "comments": [ ... ],
  "auditLogs": [ ... ]
}
```

### 6.2 Super Admin - Tenant Verisi Export

```javascript
fetch('/api/superadmin/tenants')
  .then(r => r.json())
  .then(data => {
    const tenantId = data.tenants[0].id;
    return fetch(`/api/superadmin/gdpr?type=tenant&id=${tenantId}`);
  })
  .then(r => r.json())
  .then(data => console.log('Tenant Data:', data));
```

---

## 7. Email Şablonları Testi

### 7.1 Email Önizleme

**URL'ler:**
- `http://localhost:3000/api/test/email-preview?template=invitation`
- `http://localhost:3000/api/test/email-preview?template=welcome`
- `http://localhost:3000/api/test/email-preview?template=passwordReset`
- `http://localhost:3000/api/test/email-preview?template=security`

**Beklenen Sonuç:**
- Her şablon için profesyonel HTML email görünümü
- Logo, renkler ve içerik doğru render edilmeli

---

## 8. Çoklu Dil (i18n) Testi

### 8.1 Desteklenen Diller

| Dil | Kod | Bayrak |
|-----|-----|--------|
| Türkçe | tr | 🇹🇷 |
| English | en | 🇬🇧 |

### 8.2 Çeviri Testi

Console'da test:

```javascript
import('@/lib/i18n/translations').then(({ t, formatRelativeTime }) => {
  console.log('Türkçe:', t('tr', 'common.save'));
  console.log('İngilizce:', t('en', 'common.save'));
});
```

---

## 9. AI Görsel Üretimi Testi

### 9.1 Yapılandırma Kontrolü

**Gerekli Environment Variables (en az biri):**
- `SSM_CONTENT_API_KEY` - SSM Content API
- `OPENAI_API_KEY` - OpenAI
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` - AWS Bedrock

### 9.2 API Testi

**Yapılandırma yoksa:**
```bash
curl -X POST "http://localhost:3000/api/ai/generate-image" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Haber"}'
```

**Beklenen Yanıt (yapılandırma yoksa):**
```json
{
  "error": "Görsel üretimi yapılandırılmamış",
  "missingConfig": true
}
```

### 9.3 Admin Panel Testi

1. Admin paneline giriş yap
2. Haberler → Yeni Haber
3. "AI ile görsel üret" butonuna tıkla

**Beklenen Sonuç:**
- Yapılandırma varsa: Görsel üretilmeli
- Yapılandırma yoksa: Açıklayıcı hata mesajı

---

## 10. Public Site Testi

### 10.1 Ana Sayfa

**URL:** `http://demo.localhost:3000` veya `http://localhost:3000`

**Kontrol Listesi:**
- [ ] Site başlığı (tenant adı) görünüyor
- [ ] Navigasyon menüsü çalışıyor
- [ ] Hero bölümü görünüyor
- [ ] Son haberler listesi görünüyor
- [ ] Footer görünüyor
- [ ] Tema renkleri doğru uygulanmış

### 10.2 Kategori Sayfası

**URL:** `http://localhost:3000/gundem`

**Kontrol Listesi:**
- [ ] Kategori başlığı görünüyor
- [ ] Makaleler listeleniyor
- [ ] Sayfalama çalışıyor

### 10.3 Makale Detay

**URL:** `http://localhost:3000/gundem/ornek-makale`

**Kontrol Listesi:**
- [ ] Makale başlığı görünüyor
- [ ] İçerik render ediliyor
- [ ] Yazar bilgisi görünüyor
- [ ] Paylaşım butonları çalışıyor
- [ ] İlgili haberler görünüyor

### 10.4 Arama

**URL:** `http://localhost:3000/arama?q=test`

**Kontrol Listesi:**
- [ ] Arama sonuçları listeleniyor
- [ ] Sonuç sayısı görünüyor
- [ ] Boş sonuç mesajı çalışıyor

### 10.5 Servisler

| Servis | URL | Kontrol |
|--------|-----|---------|
| Döviz | /servisler/doviz | Kur tablosu |
| Altın | /servisler/altin-fiyatlari | Altın fiyatları |
| Hava Durumu | /servisler/hava-durumu | Hava bilgisi |
| Nöbetçi Eczane | /servisler/nobetci-eczane | Eczane listesi |
| Namaz Vakitleri | /servisler/namaz-vakitleri | Vakit tablosu |
| TV Rehberi | /servisler/tv-rehberi | Program listesi |

---

## 11. Admin Panel Testleri

### 11.1 Giriş

**URL:** `http://localhost:3000/admin/giris`

**Test Hesabı:**
- E-posta: `admin@demo.sonbirsoz-saas.com`
- Şifre: `demo-password-123`

### 11.2 Dashboard

**URL:** `/admin/dashboard`

**Kontrol Listesi:**
- [ ] İstatistik kartları görünüyor
- [ ] Son aktiviteler listesi
- [ ] Grafikler yükleniyor

### 11.3 Haberler

**URL:** `/admin/haberler`

**Test Senaryoları:**
1. Yeni haber oluştur
2. Mevcut haberi düzenle
3. Haber sil
4. Durum değiştir (Taslak → Yayında)

### 11.4 Kategoriler

**URL:** `/admin/kategoriler`

**Test Senaryoları:**
1. Yeni kategori ekle
2. Kategori düzenle
3. Kategori sil

### 11.5 Yazarlar

**URL:** `/admin/yazarlar`

**Test Senaryoları:**
1. Yeni yazar ekle
2. Yazar profili düzenle
3. Yazar sil

### 11.6 Medya

**URL:** `/admin/medya`

**Test Senaryoları:**
1. Görsel yükle
2. Görsel sil
3. Galeri görünümü

### 11.7 Tema Ayarları

**URL:** `/admin/tema`

**Test Senaryoları:**
1. Renk değiştir
2. Hazır tema seç
3. Logo yükle
4. Değişiklikleri kaydet

### 11.8 Plan & Kullanım

**URL:** `/admin/fatura`

**Kontrol Listesi:**
- [ ] Mevcut plan görünüyor
- [ ] Kullanım istatistikleri
- [ ] Limit göstergeleri

### 11.9 API Anahtarları (Enterprise)

**URL:** `/admin/api-keys`

**Kontrol Listesi:**
- [ ] Enterprise değilse: Upgrade mesajı
- [ ] Enterprise ise: API key listesi ve oluşturma

---

## 12. Super Admin Panel Testleri

### 12.1 Giriş

**URL:** `http://localhost:3000/superadmin-giris`

**Test Hesabı:**
- E-posta: `superadmin@sonbirsoz-saas.com`
- Şifre: `admin123`

### 12.2 Dashboard

**URL:** `/superadmin/dashboard`

**Kontrol Listesi:**
- [ ] Platform istatistikleri
- [ ] Tenant sayıları
- [ ] Plan dağılımı
- [ ] Son aktiviteler

### 12.3 Tenant Yönetimi

**URL:** `/superadmin/tenants`

**Test Senaryoları:**
1. Tenant listesini görüntüle
2. Arama ve filtreleme
3. Tenant detayına git
4. Tenant düzenle
5. Tenant deaktif et

### 12.4 Yeni Tenant Oluşturma

**URL:** `/superadmin/tenants` → "Yeni Tenant"

**Wizard Adımları:**
1. Temel Bilgiler: Ad, slug, domain
2. Görünüm: Renk, logo
3. Kategoriler: Şablon seç
4. Admin: İlk admin kullanıcı

### 12.5 Kullanıcı Yönetimi

**URL:** `/superadmin/users`

**Test Senaryoları:**
1. Kullanıcı listesi
2. Kullanıcı detayı
3. Rol değiştir
4. Kullanıcı deaktif et

### 12.6 Faturalama

**URL:** `/superadmin/billing`

**Kontrol Listesi:**
- [ ] MRR (Aylık Gelir)
- [ ] Aktif abonelikler
- [ ] Trial tenant'lar
- [ ] Plan dağılımı

### 12.7 Sistem Durumu

**URL:** `/superadmin/system`

**Kontrol Listesi:**
- [ ] Sistem sağlık durumu
- [ ] Veritabanı bağlantısı
- [ ] API yanıt süreleri
- [ ] Son 24 saat metrikleri

---

## 13. AWS Amplify Deployment Testi

### 13.1 Pre-Deployment Checklist

- [ ] `npm run build` başarılı
- [ ] `amplify.yml` dosyası mevcut
- [ ] GitHub'a push edildi
- [ ] Environment variables hazır

### 13.2 Deployment Sonrası Testler

| Test | URL | Beklenen |
|------|-----|----------|
| Ana Sayfa | https://xxx.amplifyapp.com | ✅ Yüklenmeli |
| Super Admin | https://xxx.amplifyapp.com/superadmin-giris | ✅ Form |
| Admin | https://xxx.amplifyapp.com/admin/giris | ✅ Form |
| API Docs | https://xxx.amplifyapp.com/api-docs | ✅ Swagger |
| Health | https://xxx.amplifyapp.com/api/superadmin/system | ✅ JSON |

### 13.3 Environment Variables Kontrolü

Amplify Console → Environment variables:

**Zorunlu:**
- [ ] DATABASE_URL
- [ ] NEXTAUTH_SECRET
- [ ] NEXTAUTH_URL
- [ ] SEED_ADMIN_EMAIL
- [ ] SEED_ADMIN_PASSWORD
- [ ] BASE_DOMAIN
- [ ] CRON_SECRET

**Opsiyonel (AI için):**
- [ ] SSM_CONTENT_API_KEY
- [ ] OPENAI_API_KEY
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY

---

## Test Kontrol Listesi (Özet)

### Production Build
- [ ] `npm run build` başarılı
- [ ] `npm run start` başarılı
- [ ] Ana sayfa yükleniyor

### Multi-Tenant
- [ ] Subdomain routing çalışıyor
- [ ] Tenant izolasyonu doğru
- [ ] Debug endpoint çalışıyor

### Güvenlik
- [ ] Hesap kilitleme
- [ ] Rate limiting
- [ ] XSS koruması
- [ ] Security headers

### API & Docs
- [ ] Swagger UI
- [ ] OpenAPI JSON
- [ ] API authentication

### GDPR & Email
- [ ] Veri export
- [ ] Email şablonları

### AI
- [ ] Yapılandırma kontrolü
- [ ] Görsel üretimi (yapılandırılmışsa)

### Public Site
- [ ] Ana sayfa
- [ ] Kategori sayfası
- [ ] Makale detay
- [ ] Arama
- [ ] Servisler

### Admin Panel
- [ ] Giriş
- [ ] Dashboard
- [ ] Haberler CRUD
- [ ] Kategoriler CRUD
- [ ] Tema ayarları

### Super Admin
- [ ] Giriş
- [ ] Dashboard
- [ ] Tenant yönetimi
- [ ] Yeni tenant oluşturma
- [ ] Sistem durumu

### Deployment
- [ ] Amplify build başarılı
- [ ] Environment variables
- [ ] Production URL'ler çalışıyor

---

## Sorun Giderme

| Hata | Çözüm |
|------|-------|
| "Tenant bulunamadı" | hosts dosyasına subdomain ekleyin |
| "Unauthorized" | Tekrar giriş yapın |
| "Rate limit exceeded" | 1 dakika bekleyin |
| Beyaz ekran | Ctrl+Shift+R ile hard refresh |
| Veritabanı hatası | `npx prisma db push` |
| Build hatası | Terminal loglarını kontrol edin |

---

**Son Güncelleme:** 10 Ağustos 2026  
**Versiyon:** 2.0
