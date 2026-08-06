"use client";

import { useLocale } from "./provider";
import { SUPPORTED_LOCALES, LOCALE_NAMES, LOCALE_FLAGS, Locale } from "./translations";

interface LocaleSwitcherProps {
  className?: string;
  showFlags?: boolean;
  showNames?: boolean;
  variant?: "dropdown" | "buttons";
}

export function LocaleSwitcher({
  className = "",
  showFlags = true,
  showNames = true,
  variant = "dropdown",
}: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale();

  if (variant === "buttons") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${locale === loc 
                ? "bg-primary text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            {showFlags && <span className="mr-1">{LOCALE_FLAGS[loc]}</span>}
            {showNames && LOCALE_NAMES[loc]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`
        px-3 py-2 rounded-md border border-gray-300 bg-white text-sm
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        ${className}
      `}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc}>
          {showFlags && `${LOCALE_FLAGS[loc]} `}
          {LOCALE_NAMES[loc]}
        </option>
      ))}
    </select>
  );
}
