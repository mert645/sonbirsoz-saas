"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { 
  Locale, 
  DEFAULT_LOCALE, 
  SUPPORTED_LOCALES, 
  TranslationKeys, 
  getTranslations, 
  t as translate,
  formatRelativeTime as formatTime,
} from "./translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
  translate: (key: string, params?: Record<string, string | number>) => string;
  formatRelativeTime: (date: Date) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_STORAGE_KEY = "sonbirsoz-locale";

export function I18nProvider({ 
  children,
  defaultLocale = DEFAULT_LOCALE,
}: { 
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Client-side'da localStorage'dan locale'i yükle
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      setLocaleState(stored as Locale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      // HTML lang attribute güncelle
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = getTranslations(locale);

  const translateFn = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  const formatRelativeTimeFn = useCallback(
    (date: Date) => {
      return formatTime(date, locale);
    },
    [locale]
  );

  // SSR sırasında default locale kullan
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          locale: defaultLocale,
          setLocale: () => {},
          t: getTranslations(defaultLocale),
          translate: (key) => translate(defaultLocale, key),
          formatRelativeTime: (date) => formatTime(date, defaultLocale),
        }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        translate: translateFn,
        formatRelativeTime: formatRelativeTimeFn,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslations() {
  const { t } = useI18n();
  return t;
}

export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
