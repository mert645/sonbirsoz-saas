"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { hexToHsl, hslToString, getContrastColor } from "./colors";

export interface TenantTheme {
  primaryColor: string;
  logo: string | null;
  favicon: string | null;
  siteName: string;
  tagline: string | null;
}

interface ThemeContextValue {
  theme: TenantTheme | null;
  setTheme: (theme: TenantTheme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  setTheme: () => {},
  isLoading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * CSS custom properties'i günceller
 */
function applyThemeToDocument(theme: TenantTheme) {
  const root = document.documentElement;
  const hsl = hexToHsl(theme.primaryColor);

  if (hsl) {
    // Primary renk ve varyasyonları
    root.style.setProperty("--primary", hslToString(hsl));
    root.style.setProperty(
      "--primary-foreground",
      getContrastColor(theme.primaryColor) === "#ffffff" ? "0 0% 100%" : "0 0% 0%"
    );

    // Açık ve koyu varyasyonlar
    root.style.setProperty(
      "--primary-light",
      hslToString({ ...hsl, l: Math.min(hsl.l + 15, 95) })
    );
    root.style.setProperty(
      "--primary-dark",
      hslToString({ ...hsl, l: Math.max(hsl.l - 15, 5) })
    );

    // Ring rengi
    root.style.setProperty("--ring", hslToString(hsl));
  }

  // Favicon güncelle
  if (theme.favicon) {
    const existingFavicon = document.querySelector("link[rel='icon']");
    if (existingFavicon) {
      existingFavicon.setAttribute("href", theme.favicon);
    }
  }

  // Title güncelle
  if (theme.siteName) {
    const titleSuffix = theme.tagline ? ` — ${theme.tagline}` : "";
    document.title = `${theme.siteName}${titleSuffix}`;
  }
}

interface TenantThemeProviderProps {
  children: ReactNode;
  initialTheme?: TenantTheme;
}

export function TenantThemeProvider({
  children,
  initialTheme,
}: TenantThemeProviderProps) {
  const [theme, setThemeState] = useState<TenantTheme | null>(initialTheme || null);
  const [isLoading, setIsLoading] = useState(!initialTheme);

  const setTheme = (newTheme: TenantTheme) => {
    setThemeState(newTheme);
    applyThemeToDocument(newTheme);
  };

  useEffect(() => {
    if (initialTheme) {
      applyThemeToDocument(initialTheme);
      return;
    }

    // Tema bilgisini API'den al
    async function fetchTheme() {
      try {
        const res = await fetch("/api/tenant/theme");
        if (res.ok) {
          const data = await res.json();
          setTheme(data);
        }
      } catch (error) {
        console.error("Error fetching theme:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTheme();
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Inline style olarak tema değişkenlerini döndürür
 * Server component'larda kullanılabilir
 */
export function getThemeStyles(primaryColor: string): React.CSSProperties {
  const hsl = hexToHsl(primaryColor);
  if (!hsl) return {};

  return {
    "--primary": hslToString(hsl),
    "--primary-foreground":
      getContrastColor(primaryColor) === "#ffffff" ? "0 0% 100%" : "0 0% 0%",
    "--primary-light": hslToString({ ...hsl, l: Math.min(hsl.l + 15, 95) }),
    "--primary-dark": hslToString({ ...hsl, l: Math.max(hsl.l - 15, 5) }),
    "--ring": hslToString(hsl),
  } as React.CSSProperties;
}
