/**
 * Internationalization (i18n) System
 * Türkçe ve İngilizce dil desteği
 */

export type Locale = "tr" | "en";

export const DEFAULT_LOCALE: Locale = "tr";
export const SUPPORTED_LOCALES: Locale[] = ["tr", "en"];

export const LOCALE_NAMES: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
};

/**
 * Çeviri anahtarları tipi
 */
export interface TranslationKeys {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    yes: string;
    no: string;
    all: string;
    none: string;
    select: string;
    upload: string;
    download: string;
    refresh: string;
    actions: string;
    status: string;
    date: string;
    name: string;
    email: string;
    password: string;
    description: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
  };
  
  // Auth
  auth: {
    signIn: string;
    signOut: string;
    signUp: string;
    forgotPassword: string;
    resetPassword: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    rememberMe: string;
    invalidCredentials: string;
    accountLocked: string;
    sessionExpired: string;
  };
  
  // Navigation
  nav: {
    dashboard: string;
    articles: string;
    categories: string;
    authors: string;
    media: string;
    comments: string;
    users: string;
    settings: string;
    billing: string;
    theme: string;
    apiKeys: string;
    analytics: string;
  };
  
  // Articles
  articles: {
    title: string;
    newArticle: string;
    editArticle: string;
    deleteArticle: string;
    publishArticle: string;
    unpublishArticle: string;
    draft: string;
    published: string;
    review: string;
    archived: string;
    content: string;
    spot: string;
    coverImage: string;
    category: string;
    author: string;
    tags: string;
    seoTitle: string;
    seoDescription: string;
    publishedAt: string;
    viewCount: string;
    readingTime: string;
    noArticles: string;
    confirmDelete: string;
  };
  
  // Categories
  categories: {
    title: string;
    newCategory: string;
    editCategory: string;
    deleteCategory: string;
    color: string;
    icon: string;
    order: string;
    parentCategory: string;
    articleCount: string;
    noCategories: string;
    hasArticles: string;
  };
  
  // Users
  users: {
    title: string;
    inviteUser: string;
    editUser: string;
    deleteUser: string;
    role: string;
    roles: {
      owner: string;
      admin: string;
      editor: string;
      author: string;
      user: string;
      superAdmin: string;
    };
    active: string;
    inactive: string;
    pending: string;
    lastLogin: string;
    invitationSent: string;
    noUsers: string;
  };
  
  // Billing
  billing: {
    title: string;
    currentPlan: string;
    usage: string;
    upgrade: string;
    downgrade: string;
    cancel: string;
    plans: {
      starter: string;
      professional: string;
      enterprise: string;
    };
    features: string;
    limits: string;
    articlesPerMonth: string;
    storageLimit: string;
    usersLimit: string;
    aiFeatures: string;
    apiAccess: string;
    customDomain: string;
  };
  
  // Errors
  errors: {
    generic: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    validation: string;
    network: string;
    serverError: string;
    rateLimited: string;
    fileTooLarge: string;
    invalidFormat: string;
  };
  
  // Success messages
  success: {
    saved: string;
    created: string;
    updated: string;
    deleted: string;
    published: string;
    uploaded: string;
    sent: string;
    copied: string;
  };
  
  // Confirmations
  confirm: {
    delete: string;
    publish: string;
    unpublish: string;
    cancel: string;
    logout: string;
  };
  
  // Time
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;
    monthsAgo: string;
    yearsAgo: string;
  };
}

/**
 * Türkçe çeviriler
 */
export const tr: TranslationKeys = {
  common: {
    save: "Kaydet",
    cancel: "İptal",
    delete: "Sil",
    edit: "Düzenle",
    create: "Oluştur",
    search: "Ara",
    filter: "Filtrele",
    loading: "Yükleniyor...",
    error: "Hata",
    success: "Başarılı",
    confirm: "Onayla",
    back: "Geri",
    next: "İleri",
    previous: "Önceki",
    close: "Kapat",
    yes: "Evet",
    no: "Hayır",
    all: "Tümü",
    none: "Hiçbiri",
    select: "Seç",
    upload: "Yükle",
    download: "İndir",
    refresh: "Yenile",
    actions: "İşlemler",
    status: "Durum",
    date: "Tarih",
    name: "Ad",
    email: "E-posta",
    password: "Şifre",
    description: "Açıklama",
    settings: "Ayarlar",
    logout: "Çıkış Yap",
    login: "Giriş Yap",
    register: "Kayıt Ol",
  },
  
  auth: {
    signIn: "Giriş Yap",
    signOut: "Çıkış Yap",
    signUp: "Kayıt Ol",
    forgotPassword: "Şifremi Unuttum",
    resetPassword: "Şifreyi Sıfırla",
    emailPlaceholder: "E-posta adresiniz",
    passwordPlaceholder: "Şifreniz",
    rememberMe: "Beni Hatırla",
    invalidCredentials: "E-posta veya şifre hatalı",
    accountLocked: "Hesabınız geçici olarak kilitlendi",
    sessionExpired: "Oturumunuz sona erdi, lütfen tekrar giriş yapın",
  },
  
  nav: {
    dashboard: "Panel",
    articles: "Haberler",
    categories: "Kategoriler",
    authors: "Yazarlar",
    media: "Medya",
    comments: "Yorumlar",
    users: "Kullanıcılar",
    settings: "Ayarlar",
    billing: "Fatura",
    theme: "Tema",
    apiKeys: "API Anahtarları",
    analytics: "Analitik",
  },
  
  articles: {
    title: "Haberler",
    newArticle: "Yeni Haber",
    editArticle: "Haberi Düzenle",
    deleteArticle: "Haberi Sil",
    publishArticle: "Yayınla",
    unpublishArticle: "Yayından Kaldır",
    draft: "Taslak",
    published: "Yayında",
    review: "İncelemede",
    archived: "Arşivde",
    content: "İçerik",
    spot: "Spot",
    coverImage: "Kapak Görseli",
    category: "Kategori",
    author: "Yazar",
    tags: "Etiketler",
    seoTitle: "SEO Başlığı",
    seoDescription: "SEO Açıklaması",
    publishedAt: "Yayın Tarihi",
    viewCount: "Görüntülenme",
    readingTime: "Okuma Süresi",
    noArticles: "Henüz haber bulunmuyor",
    confirmDelete: "Bu haberi silmek istediğinizden emin misiniz?",
  },
  
  categories: {
    title: "Kategoriler",
    newCategory: "Yeni Kategori",
    editCategory: "Kategoriyi Düzenle",
    deleteCategory: "Kategoriyi Sil",
    color: "Renk",
    icon: "İkon",
    order: "Sıra",
    parentCategory: "Üst Kategori",
    articleCount: "Haber Sayısı",
    noCategories: "Henüz kategori bulunmuyor",
    hasArticles: "Bu kategoride haberler var, silinemez",
  },
  
  users: {
    title: "Kullanıcılar",
    inviteUser: "Kullanıcı Davet Et",
    editUser: "Kullanıcıyı Düzenle",
    deleteUser: "Kullanıcıyı Sil",
    role: "Rol",
    roles: {
      owner: "Sahip",
      admin: "Yönetici",
      editor: "Editör",
      author: "Yazar",
      user: "Kullanıcı",
      superAdmin: "Süper Admin",
    },
    active: "Aktif",
    inactive: "Pasif",
    pending: "Beklemede",
    lastLogin: "Son Giriş",
    invitationSent: "Davet gönderildi",
    noUsers: "Henüz kullanıcı bulunmuyor",
  },
  
  billing: {
    title: "Fatura & Plan",
    currentPlan: "Mevcut Plan",
    usage: "Kullanım",
    upgrade: "Yükselt",
    downgrade: "Düşür",
    cancel: "İptal Et",
    plans: {
      starter: "Başlangıç",
      professional: "Profesyonel",
      enterprise: "Kurumsal",
    },
    features: "Özellikler",
    limits: "Limitler",
    articlesPerMonth: "Aylık Haber",
    storageLimit: "Depolama",
    usersLimit: "Kullanıcı",
    aiFeatures: "AI Özellikleri",
    apiAccess: "API Erişimi",
    customDomain: "Özel Domain",
  },
  
  errors: {
    generic: "Bir hata oluştu",
    notFound: "Sayfa bulunamadı",
    unauthorized: "Oturum açmanız gerekiyor",
    forbidden: "Bu işlem için yetkiniz yok",
    validation: "Lütfen formu kontrol edin",
    network: "Bağlantı hatası",
    serverError: "Sunucu hatası",
    rateLimited: "Çok fazla istek, lütfen bekleyin",
    fileTooLarge: "Dosya çok büyük",
    invalidFormat: "Geçersiz format",
  },
  
  success: {
    saved: "Kaydedildi",
    created: "Oluşturuldu",
    updated: "Güncellendi",
    deleted: "Silindi",
    published: "Yayınlandı",
    uploaded: "Yüklendi",
    sent: "Gönderildi",
    copied: "Kopyalandı",
  },
  
  confirm: {
    delete: "Silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
    publish: "Bu içeriği yayınlamak istediğinizden emin misiniz?",
    unpublish: "Bu içeriği yayından kaldırmak istediğinizden emin misiniz?",
    cancel: "İptal etmek istediğinizden emin misiniz? Değişiklikler kaybolacak.",
    logout: "Çıkış yapmak istediğinizden emin misiniz?",
  },
  
  time: {
    justNow: "Az önce",
    minutesAgo: "{count} dakika önce",
    hoursAgo: "{count} saat önce",
    daysAgo: "{count} gün önce",
    weeksAgo: "{count} hafta önce",
    monthsAgo: "{count} ay önce",
    yearsAgo: "{count} yıl önce",
  },
};

/**
 * İngilizce çeviriler
 */
export const en: TranslationKeys = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    select: "Select",
    upload: "Upload",
    download: "Download",
    refresh: "Refresh",
    actions: "Actions",
    status: "Status",
    date: "Date",
    name: "Name",
    email: "Email",
    password: "Password",
    description: "Description",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    register: "Register",
  },
  
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    signUp: "Sign Up",
    forgotPassword: "Forgot Password",
    resetPassword: "Reset Password",
    emailPlaceholder: "Your email address",
    passwordPlaceholder: "Your password",
    rememberMe: "Remember Me",
    invalidCredentials: "Invalid email or password",
    accountLocked: "Your account has been temporarily locked",
    sessionExpired: "Your session has expired, please sign in again",
  },
  
  nav: {
    dashboard: "Dashboard",
    articles: "Articles",
    categories: "Categories",
    authors: "Authors",
    media: "Media",
    comments: "Comments",
    users: "Users",
    settings: "Settings",
    billing: "Billing",
    theme: "Theme",
    apiKeys: "API Keys",
    analytics: "Analytics",
  },
  
  articles: {
    title: "Articles",
    newArticle: "New Article",
    editArticle: "Edit Article",
    deleteArticle: "Delete Article",
    publishArticle: "Publish",
    unpublishArticle: "Unpublish",
    draft: "Draft",
    published: "Published",
    review: "In Review",
    archived: "Archived",
    content: "Content",
    spot: "Summary",
    coverImage: "Cover Image",
    category: "Category",
    author: "Author",
    tags: "Tags",
    seoTitle: "SEO Title",
    seoDescription: "SEO Description",
    publishedAt: "Published At",
    viewCount: "Views",
    readingTime: "Reading Time",
    noArticles: "No articles yet",
    confirmDelete: "Are you sure you want to delete this article?",
  },
  
  categories: {
    title: "Categories",
    newCategory: "New Category",
    editCategory: "Edit Category",
    deleteCategory: "Delete Category",
    color: "Color",
    icon: "Icon",
    order: "Order",
    parentCategory: "Parent Category",
    articleCount: "Article Count",
    noCategories: "No categories yet",
    hasArticles: "This category has articles and cannot be deleted",
  },
  
  users: {
    title: "Users",
    inviteUser: "Invite User",
    editUser: "Edit User",
    deleteUser: "Delete User",
    role: "Role",
    roles: {
      owner: "Owner",
      admin: "Admin",
      editor: "Editor",
      author: "Author",
      user: "User",
      superAdmin: "Super Admin",
    },
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    lastLogin: "Last Login",
    invitationSent: "Invitation sent",
    noUsers: "No users yet",
  },
  
  billing: {
    title: "Billing & Plan",
    currentPlan: "Current Plan",
    usage: "Usage",
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    cancel: "Cancel",
    plans: {
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
    },
    features: "Features",
    limits: "Limits",
    articlesPerMonth: "Articles/Month",
    storageLimit: "Storage",
    usersLimit: "Users",
    aiFeatures: "AI Features",
    apiAccess: "API Access",
    customDomain: "Custom Domain",
  },
  
  errors: {
    generic: "An error occurred",
    notFound: "Page not found",
    unauthorized: "Please sign in",
    forbidden: "You don't have permission for this action",
    validation: "Please check the form",
    network: "Connection error",
    serverError: "Server error",
    rateLimited: "Too many requests, please wait",
    fileTooLarge: "File is too large",
    invalidFormat: "Invalid format",
  },
  
  success: {
    saved: "Saved",
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    published: "Published",
    uploaded: "Uploaded",
    sent: "Sent",
    copied: "Copied",
  },
  
  confirm: {
    delete: "Are you sure you want to delete? This action cannot be undone.",
    publish: "Are you sure you want to publish this content?",
    unpublish: "Are you sure you want to unpublish this content?",
    cancel: "Are you sure you want to cancel? Changes will be lost.",
    logout: "Are you sure you want to logout?",
  },
  
  time: {
    justNow: "Just now",
    minutesAgo: "{count} minutes ago",
    hoursAgo: "{count} hours ago",
    daysAgo: "{count} days ago",
    weeksAgo: "{count} weeks ago",
    monthsAgo: "{count} months ago",
    yearsAgo: "{count} years ago",
  },
};

/**
 * Tüm çeviriler
 */
export const translations: Record<Locale, TranslationKeys> = {
  tr,
  en,
};

/**
 * Çeviri alma fonksiyonu
 */
export function getTranslations(locale: Locale = DEFAULT_LOCALE): TranslationKeys {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

/**
 * Tek bir çeviri anahtarı alma (nested key desteği)
 */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = translations[locale] || translations[DEFAULT_LOCALE];
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Anahtar bulunamazsa key'i döndür
    }
  }
  
  if (typeof value !== "string") {
    return key;
  }
  
  // Parametreleri değiştir
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return String(params[paramKey] ?? `{${paramKey}}`);
    });
  }
  
  return value;
}

/**
 * Relative time formatı
 */
export function formatRelativeTime(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const trans = getTranslations(locale);
  
  if (diffSeconds < 60) return trans.time.justNow;
  if (diffMinutes < 60) return t(locale, "time.minutesAgo", { count: diffMinutes });
  if (diffHours < 24) return t(locale, "time.hoursAgo", { count: diffHours });
  if (diffDays < 7) return t(locale, "time.daysAgo", { count: diffDays });
  if (diffWeeks < 4) return t(locale, "time.weeksAgo", { count: diffWeeks });
  if (diffMonths < 12) return t(locale, "time.monthsAgo", { count: diffMonths });
  return t(locale, "time.yearsAgo", { count: diffYears });
}
