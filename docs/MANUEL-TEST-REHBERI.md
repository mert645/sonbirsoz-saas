# SonBirSöz SaaS - Manuel Test Rehberi

Bu döküman, SonBirSöz SaaS platformunda yapılan geliştirmelerin manuel olarak test edilmesi için hazırlanmıştır.

---

## İçindekiler

1. [Ön Hazırlık](#1-ön-hazırlık)
2. [Production Modda Test](#2-production-modda-test)
3. [Güvenlik Testleri](#3-güvenlik-testleri)
4. [API Dokümantasyonu Testi](#4-api-dokümantasyonu-testi)
5. [GDPR Uyumluluk Testleri](#5-gdpr-uyumluluk-testleri)
6. [Email Şablonları Testi](#6-email-şablonları-testi)
7. [Çoklu Dil (i18n) Testi](#7-çoklu-dil-i18n-testi)
8. [Public Site Testi](#8-public-site-testi)
9. [Admin Panel Testleri](#9-admin-panel-testleri)
10. [Super Admin Panel Testleri](#10-super-admin-panel-testleri)

---

## 1. Ön Hazırlık

### 1.1 Gereksinimler

- Node.js 18+ yüklü olmalı
- PostgreSQL veritabanı bağlantısı (Neon veya local)
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
| Tenant Admin | admin@demo.sonbirsoz.com | demo-password-123 | Demo tenant |

---

## 2. Production Modda Test

Production modu, uygulamanın gerçek ortamda nasıl çalışacağını simüle eder. Development modundan farklı olarak optimize edilmiş kod çalışır.

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

**Olası Hatalar ve Çözümleri:**

| Hata | Çözüm |
|------|-------|
| `EADDRINUSE: address already in use` | `taskkill /F /IM node.exe` komutu ile tüm node işlemlerini durdurun |
| `TypeScript errors` | `npm run build` çıktısındaki hataları inceleyin |
| `Module not found` | `npm install` komutunu tekrar çalıştırın |

### 2.2 Production Sunucusunu Başlatma

```bash
# Production sunucusunu başlat
npm run start
```

**Beklenen Çıktı:**
```
▲ Next.js 16.3.0
- Local:         http://localhost:3000
- Network:       http://192.168.x.x:3000
✓ Ready in 196ms
```

### 2.3 Production vs Development Farkları

| Özellik | Development | Production |
|---------|-------------|------------|
| Hot Reload | ✅ Aktif | ❌ Yok |
| Hata Detayları | ✅ Detaylı | ❌ Genel mesaj |
| Performans | Yavaş | Optimize |
| Source Maps | ✅ Var | ❌ Yok |
| CSP Header | Gevşek | Sıkı |
| Cache | Devre dışı | Aktif |

### 2.4 Production Modda Hızlı Kontrol Listesi

Sunucu başladıktan sonra şu sayfaları kontrol edin:

| Sayfa | URL | Beklenen Durum |
|-------|-----|----------------|
| Ana Sayfa | http://localhost:3000 | ✅ Yüklenmeli |
| Super Admin Giriş | http://localhost:3000/superadmin-giris | ✅ Form görünmeli |
| Admin Giriş | http://localhost:3000/admin/giris | ✅ Form görünmeli |
| API Docs | http://localhost:3000/api-docs | ✅ Swagger UI görünmeli |
| Health Check | http://localhost:3000/api/superadmin/system | ✅ JSON yanıt (auth gerekli) |

### 2.5 Production Modda Giriş Testi

**Super Admin Girişi:**

1. `http://localhost:3000/superadmin-giris` adresine git
2. E-posta: `superadmin@sonbirsoz-saas.com`
3. Şifre: `admin123`
4. "Giriş Yap" butonuna tıkla

**Beklenen Sonuç:**
- `/superadmin/dashboard` sayfasına yönlendirilmeli
- Dashboard istatistikleri görünmeli

**Admin Girişi:**

1. `http://localhost:3000/admin/giris` adresine git
2. E-posta: `admin@demo.sonbirsoz.com`
3. Şifre: `demo-password-123`
4. "Giriş Yap" butonuna tıkla

**Beklenen Sonuç:**
- `/admin/dashboard` sayfasına yönlendirilmeli
- Tenant dashboard görünmeli

### 2.6 Production Hata Ayıklama

Eğer bir sayfa çalışmıyorsa:

1. **Tarayıcı Console'u kontrol edin** (F12 → Console)
2. **Network sekmesini kontrol edin** (F12 → Network)
3. **Terminal çıktısını kontrol edin** (sunucunun çalıştığı terminal)

**Yaygın Production Hataları:**

| Belirti | Olası Sebep | Çözüm |
|---------|-------------|-------|
| Beyaz ekran | JavaScript hatası | Console'u kontrol edin |
| 500 hatası | Sunucu hatası | Terminal loglarını kontrol edin |
| 404 hatası | Sayfa bulunamadı | URL'i kontrol edin |
| Yavaş yükleme | Veritabanı bağlantısı | `.env.local` DATABASE_URL kontrol edin |

---

## 3. Güvenlik Testleri

### 3.1 Hesap Kilitleme Testi

**Amaç:** 5 başarısız giriş denemesinden sonra hesabın kilitlenmesini test etmek.

**Adımlar:**

1. Tarayıcıda `http://localhost:3000/superadmin-giris` adresine git
2. E-posta: `superadmin@sonbirsoz-saas.com`
3. **Yanlış** şifre gir (örn: `yanlis123`)
4. "Giriş Yap" butonuna tıkla
5. Bu işlemi **5 kez** tekrarla

**Beklenen Sonuç:**
- 5. denemeden sonra "Hesabınız geçici olarak kilitlendi" mesajı görülmeli
- 15 dakika boyunca doğru şifre ile bile giriş yapılamamalı

**Kilidi Açma (Test için):**
```sql
-- Prisma Studio ile veya SQL ile:
UPDATE users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL 
WHERE email = 'superadmin@sonbirsoz-saas.com';
```

### 3.2 Rate Limiting Testi

**Amaç:** API isteklerinin hız sınırlamasını test etmek.

**Adımlar:**

1. Tarayıcı geliştirici araçlarını aç (F12)
2. Console sekmesine git
3. Aşağıdaki kodu yapıştır ve çalıştır:

```javascript
// 15 ardışık istek gönder
for(let i = 0; i < 15; i++) {
  fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' })
  }).then(r => console.log(`İstek ${i+1}: ${r.status}`));
}
```

**Beklenen Sonuç:**
- İlk 10 istek normal yanıt almalı
- 11. istekten itibaren `429 Too Many Requests` hatası alınmalı

### 3.3 XSS Koruması Testi

**Amaç:** Zararlı script girişlerinin engellendiğini test etmek.

**Adımlar:**

1. Admin paneline giriş yap: `http://localhost:3000/admin/dashboard`
2. Kategoriler sayfasına git: `http://localhost:3000/admin/kategoriler`
3. Yeni kategori ekle butonuna tıkla
4. Kategori adı olarak şunu gir: `<script>alert('XSS')</script>`
5. Kaydet butonuna tıkla

**Beklenen Sonuç:**
- "Geçersiz karakterler tespit edildi" hatası görülmeli
- Kategori kaydedilmemeli

### 3.4 Güvenlik Header'ları Testi

**Amaç:** HTTP güvenlik header'larının doğru ayarlandığını kontrol etmek.

**Adımlar:**

1. Tarayıcı geliştirici araçlarını aç (F12)
2. Network sekmesine git
3. Herhangi bir sayfayı yenile
4. İlk isteğe tıkla ve Response Headers bölümüne bak

**Beklenen Header'lar:**
```
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 4. API Dokümantasyonu Testi

### 4.1 Swagger UI Erişimi

**Amaç:** API dokümantasyonunun görüntülenebildiğini test etmek.

**Adımlar:**

1. Tarayıcıda `http://localhost:3000/api-docs` adresine git

**Beklenen Sonuç:**
- Swagger UI arayüzü görülmeli
- Sol tarafta API endpoint'leri listelenmeli:
  - Articles
  - Categories
  - Authors
  - Media

### 4.2 OpenAPI Spec Erişimi

**Amaç:** OpenAPI JSON dosyasının erişilebilir olduğunu test etmek.

**Adımlar:**

1. Tarayıcıda `http://localhost:3000/api/docs/openapi.json` adresine git

**Beklenen Sonuç:**
- JSON formatında OpenAPI spesifikasyonu görülmeli
- `openapi: "3.0.3"` versiyonu görülmeli

### 4.3 API Endpoint Testi (Swagger UI üzerinden)

**Adımlar:**

1. Swagger UI'da "Articles" bölümünü genişlet
2. `GET /articles` endpoint'ine tıkla
3. "Try it out" butonuna tıkla
4. "Execute" butonuna tıkla

**Beklenen Sonuç:**
- `401 Unauthorized` hatası (API key olmadan)
- Response body'de hata mesajı görülmeli

---

## 5. GDPR Uyumluluk Testleri

### 5.1 Kullanıcı Verisi Export Testi

**Amaç:** Kullanıcının kendi verilerini indirebilmesini test etmek.

**Adımlar:**

1. Admin paneline giriş yap
2. Tarayıcı geliştirici araçlarını aç (F12)
3. Console'da şu kodu çalıştır:

```javascript
fetch('/api/admin/gdpr/export')
  .then(r => r.json())
  .then(data => console.log(data));
```

**Beklenen Sonuç:**
- Kullanıcı bilgileri JSON formatında görülmeli:
  - `user`: Temel kullanıcı bilgileri
  - `tenants`: Bağlı tenant'lar
  - `articles`: Yazılan makaleler
  - `comments`: Yapılan yorumlar
  - `auditLogs`: Aktivite logları

### 5.2 Super Admin - Tenant Verisi Export

**Amaç:** Super Admin'in herhangi bir tenant'ın verilerini export edebilmesini test etmek.

**Adımlar:**

1. Super Admin olarak giriş yap
2. Console'da şu kodu çalıştır:

```javascript
// Önce tenant ID'sini bul
fetch('/api/superadmin/tenants')
  .then(r => r.json())
  .then(data => {
    const tenantId = data.tenants[0].id;
    console.log('Tenant ID:', tenantId);
    
    // Tenant verisini export et
    return fetch(`/api/superadmin/gdpr?type=tenant&id=${tenantId}`);
  })
  .then(r => r.json())
  .then(data => console.log('Tenant Data:', data));
```

**Beklenen Sonuç:**
- Tenant'a ait tüm veriler görülmeli:
  - Tenant bilgileri
  - Kullanıcılar
  - Makaleler
  - Kategoriler
  - Medya dosyaları

---

## 6. Email Şablonları Testi

### 6.1 Email Şablonlarını Görüntüleme

Email şablonları henüz bir önizleme sayfası olmadığı için, kod üzerinden test edilebilir.

**Test için geçici bir API endpoint oluşturma:**

1. `src/app/api/test/email-preview/route.ts` dosyası oluştur:

```typescript
import { NextResponse } from "next/server";
import {
  invitationEmail,
  welcomeEmail,
  passwordResetEmail,
  securityAlertEmail,
} from "@/lib/email/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "invitation";

  const templates: Record<string, string> = {
    invitation: invitationEmail({
      inviterName: "Ahmet Yılmaz",
      tenantName: "Demo Haber",
      role: "EDITOR",
      inviteUrl: "http://localhost:3000/invite?token=test123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    welcome: welcomeEmail({
      userName: "Mehmet Demir",
      tenantName: "Demo Haber",
      loginUrl: "http://localhost:3000/admin/dashboard",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    passwordReset: passwordResetEmail({
      userName: "Ayşe Kaya",
      resetUrl: "http://localhost:3000/reset-password?token=abc123",
      expiresIn: "1 saat",
      siteName: "SonBirSöz",
      primaryColor: "#dc2626",
    }),
    security: securityAlertEmail({
      userName: "Ali Veli",
      alertType: "new_login",
      details: "Hesabınıza yeni bir cihazdan giriş yapıldı.",
      ipAddress: "192.168.1.1",
      location: "İstanbul, Türkiye",
      timestamp: new Date().toLocaleString("tr-TR"),
      siteName: "SonBirSöz",
    }),
  };

  const html = templates[template] || templates.invitation;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

2. Tarayıcıda şu adresleri ziyaret et:
   - `http://localhost:3000/api/test/email-preview?template=invitation`
   - `http://localhost:3000/api/test/email-preview?template=welcome`
   - `http://localhost:3000/api/test/email-preview?template=passwordReset`
   - `http://localhost:3000/api/test/email-preview?template=security`

**Beklenen Sonuç:**
- Her şablon için profesyonel görünümlü HTML email görülmeli
- Logo, renkler ve içerik doğru render edilmeli

---

## 7. Çoklu Dil (i18n) Testi

### 7.1 Dil Değiştirme Bileşeni Testi

i18n altyapısı hazır ancak henüz UI'a entegre edilmedi. Test için:

**Adımlar:**

1. Herhangi bir sayfaya `LocaleSwitcher` bileşenini ekle
2. Veya Console'da test et:

```javascript
// i18n fonksiyonlarını test et
import('@/lib/i18n/translations').then(({ t, formatRelativeTime }) => {
  console.log('Türkçe:', t('tr', 'common.save'));
  console.log('İngilizce:', t('en', 'common.save'));
  
  const date = new Date(Date.now() - 5 * 60 * 1000); // 5 dakika önce
  console.log('Relative TR:', formatRelativeTime(date, 'tr'));
  console.log('Relative EN:', formatRelativeTime(date, 'en'));
});
```

### 7.2 Desteklenen Diller

| Dil | Kod | Bayrak |
|-----|-----|--------|
| Türkçe | tr | 🇹🇷 |
| English | en | 🇬🇧 |

### 7.3 Çeviri Anahtarları

Mevcut çeviri kategorileri:
- `common`: Genel butonlar ve etiketler
- `auth`: Giriş/çıkış işlemleri
- `articles`: Makale yönetimi
- `categories`: Kategori yönetimi
- `users`: Kullanıcı yönetimi
- `settings`: Ayarlar
- `errors`: Hata mesajları
- `success`: Başarı mesajları

---

## 8. Public Site Testi

### 8.1 Ana Sayfa Testi

**Adımlar:**

1. Tarayıcıda `http://localhost:3000` adresine git

**Beklenen Sonuç:**
- Site başlığı görülmeli (tenant adı)
- Navigasyon menüsü görülmeli
- Hero bölümünde öne çıkan haberler görülmeli (varsa)
- Son haberler listesi görülmeli (varsa)
- Footer görülmeli

**Not:** Eğer "Tenant bulunamadı" hatası alırsanız, `hosts` dosyasına şu satırı ekleyin:
```
127.0.0.1 demo.localhost
```
Ve `http://demo.localhost:3000` adresini kullanın.

### 8.2 Kategori Sayfası Testi

**Adımlar:**

1. Ana sayfada bir kategoriye tıkla
2. Veya direkt `http://localhost:3000/gundem` adresine git

**Beklenen Sonuç:**
- Kategori başlığı görülmeli
- O kategorideki makaleler listelenmeli
- Sayfalama (pagination) çalışmalı

### 8.3 Makale Detay Sayfası Testi

**Adımlar:**

1. Herhangi bir makaleye tıkla
2. Veya `http://localhost:3000/gundem/ornek-makale` formatında bir URL'e git

**Beklenen Sonuç:**
- Makale başlığı görülmeli
- Makale içeriği görülmeli
- Yazar bilgisi görülmeli
- Paylaşım butonları görülmeli (Facebook, X, LinkedIn)
- İlgili haberler görülmeli

### 8.4 Arama Sayfası Testi

**Adımlar:**

1. Header'daki arama kutusuna bir kelime yaz
2. Enter'a bas veya arama ikonuna tıkla
3. Veya `http://localhost:3000/arama?q=test` adresine git

**Beklenen Sonuç:**
- Arama sonuçları listelenmeli
- Sonuç sayısı görülmeli
- Sonuç bulunamazsa uygun mesaj görülmeli

---

## 9. Admin Panel Testleri

### 9.1 Dashboard Testi

**Adımlar:**

1. `http://localhost:3000/admin/dashboard` adresine git
2. Tenant admin hesabıyla giriş yap

**Beklenen Sonuç:**
- İstatistik kartları görülmeli:
  - Toplam makale sayısı
  - Toplam görüntülenme
  - Toplam yorum
  - Aktif kullanıcı sayısı
- Son aktiviteler listesi görülmeli

### 9.2 API Anahtarları Testi

**Adımlar:**

1. `http://localhost:3000/admin/api-keys` adresine git

**Beklenen Sonuç:**
- Enterprise plan değilse: "Bu özellik Enterprise planında kullanılabilir" mesajı
- Enterprise plan ise: API anahtarları listesi ve yeni anahtar oluşturma formu

### 9.3 Tema Ayarları Testi

**Adımlar:**

1. `http://localhost:3000/admin/tema` adresine git
2. Renk seçiciden yeni bir renk seç
3. Site adını değiştir
4. Kaydet butonuna tıkla

**Beklenen Sonuç:**
- Canlı önizleme güncellenmeli
- Kaydetme başarılı mesajı görülmeli
- Public site yeni tema ile görülmeli

### 9.4 Plan & Kullanım Testi

**Adımlar:**

1. `http://localhost:3000/admin/fatura` adresine git

**Beklenen Sonuç:**
- Mevcut plan bilgisi görülmeli
- Kullanım istatistikleri görülmeli:
  - Makale kullanımı (örn: 5/100)
  - Kullanıcı kullanımı (örn: 2/5)
  - Depolama kullanımı
  - AI token kullanımı
- Yükseltme seçenekleri görülmeli

---

## 10. Super Admin Panel Testleri

### 10.1 Super Admin Girişi

**Adımlar:**

1. `http://localhost:3000/superadmin-giris` adresine git
2. E-posta: `superadmin@sonbirsoz-saas.com`
3. Şifre: `admin123`
4. Giriş Yap butonuna tıkla

**Beklenen Sonuç:**
- Başarılı giriş sonrası `/superadmin/dashboard` sayfasına yönlendirilmeli

### 10.2 Dashboard Testi

**Adımlar:**

1. `http://localhost:3000/superadmin/dashboard` adresine git

**Beklenen Sonuç:**
- Platform geneli istatistikler görülmeli:
  - Toplam tenant sayısı
  - Aktif tenant sayısı
  - Toplam kullanıcı sayısı
  - Toplam makale sayısı
- Son eklenen tenant'lar listesi
- Plan dağılımı grafiği

### 10.3 Tenant Yönetimi Testi

**Adımlar:**

1. `http://localhost:3000/superadmin/tenants` adresine git
2. Arama kutusuna "demo" yaz
3. Filtrelerden bir plan seç
4. Bir tenant'ın detayına git

**Beklenen Sonuç:**
- Tenant listesi görülmeli
- Arama ve filtreleme çalışmalı
- Tenant detayında tüm bilgiler görülmeli

### 10.4 Yeni Tenant Oluşturma Testi

**Adımlar:**

1. Tenant listesinde "Yeni Tenant" butonuna tıkla
2. Wizard adımlarını takip et:
   - Temel Bilgiler: Ad, slug, domain
   - Görünüm: Renk, logo
   - Kategoriler: Şablon seç veya özel ekle
   - Admin: İlk admin kullanıcı bilgileri
3. Oluştur butonuna tıkla

**Beklenen Sonuç:**
- Yeni tenant başarıyla oluşturulmalı
- Admin kullanıcı oluşturulmalı
- Seçilen kategoriler eklenmeli

### 10.5 Faturalama Testi

**Adımlar:**

1. `http://localhost:3000/superadmin/billing` adresine git

**Beklenen Sonuç:**
- MRR (Aylık Tekrarlayan Gelir) görülmeli
- Aktif abonelik sayısı
- Trial'daki tenant sayısı
- Plan dağılımı
- Tenant bazlı kullanım tablosu

### 10.6 Sistem Durumu Testi

**Adımlar:**

1. `http://localhost:3000/superadmin/system` adresine git

**Beklenen Sonuç:**
- Sistem sağlık durumu (yeşil/kırmızı)
- Veritabanı bağlantı durumu
- API yanıt süreleri
- Son 24 saat metrikleri

---

## Sorun Giderme

### Sık Karşılaşılan Hatalar

| Hata | Çözüm |
|------|-------|
| "Tenant bulunamadı" | hosts dosyasına subdomain ekleyin veya seed çalıştırın |
| "Unauthorized" | Oturumunuzun süresi dolmuş, tekrar giriş yapın |
| "Rate limit exceeded" | 1 dakika bekleyin ve tekrar deneyin |
| Beyaz ekran | Tarayıcı cache'ini temizleyin, hard refresh yapın (Ctrl+Shift+R) |
| Veritabanı hatası | `npx prisma db push` komutunu çalıştırın |

### Log Kontrolü

Hata ayıklama için terminal çıktısını kontrol edin:

```bash
# Development sunucusu logları
npm run dev

# Prisma Studio ile veritabanını görüntüle
npx prisma studio
```

---

## Test Kontrol Listesi

Her test sonrası bu listeyi işaretleyin:

### Production Build
- [ ] `npm run build` başarılı
- [ ] `npm run start` başarılı
- [ ] Ana sayfa yükleniyor
- [ ] Super Admin giriş çalışıyor
- [ ] Admin giriş çalışıyor

### Güvenlik
- [ ] Güvenlik - Hesap Kilitleme
- [ ] Güvenlik - Rate Limiting
- [ ] Güvenlik - XSS Koruması
- [ ] Güvenlik - Header'lar

### API & Dokümantasyon
- [ ] API Docs - Swagger UI
- [ ] API Docs - OpenAPI JSON

### GDPR & Email
- [ ] GDPR - Veri Export
- [ ] GDPR - Super Admin Export
- [ ] Email - Şablon Önizleme

### i18n
- [ ] i18n - Dil Değiştirme

### Public Site
- [ ] Public - Ana Sayfa
- [ ] Public - Kategori Sayfası
- [ ] Public - Makale Detay
- [ ] Public - Arama

### Admin Panel
- [ ] Admin - Dashboard
- [ ] Admin - API Anahtarları
- [ ] Admin - Tema
- [ ] Admin - Plan & Kullanım

### Super Admin Panel
- [ ] Super Admin - Giriş
- [ ] Super Admin - Dashboard
- [ ] Super Admin - Tenant Yönetimi
- [ ] Super Admin - Yeni Tenant
- [ ] Super Admin - Faturalama
- [ ] Super Admin - Sistem Durumu

---

## Notlar

- Bu döküman geliştirme ortamı için hazırlanmıştır
- Production ortamında bazı URL'ler farklı olabilir
- Test verilerini silmeden önce yedek alın
- Güvenlik testlerini dikkatli yapın, hesap kilitlenebilir

---

**Son Güncelleme:** 6 Ağustos 2026
**Versiyon:** 1.0
