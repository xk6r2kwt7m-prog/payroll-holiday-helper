import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { useTenant } from "@/hooks/useTenant";
import en from "@/i18n/en.json";
import ptPT from "@/i18n/pt-PT.json";

// ─── Types ───
type TranslationData = typeof en;
type NestedKeyOf<T, P extends string = ""> = T extends object
  ? { [K in keyof T]: K extends string ? NestedKeyOf<T[K], P extends "" ? K : `${P}.${K}`> : never }[keyof T]
  : P;

export type Locale = "en" | "pt-PT";

const LOCALE_MAP: Record<string, Locale> = {
  GB: "en",
  US: "en",
  IE: "en",
  PT: "pt-PT",
  CV: "pt-PT",
};

const translations: Record<Locale, TranslationData> = {
  en,
  "pt-PT": ptPT as TranslationData,
};

// ─── Locale formatting helpers ───
interface LocaleFormats {
  locale: Locale;
  intlLocale: string;
  currency: string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number, decimals?: number) => string;
  formatDate: (date: Date | string, style?: "short" | "medium" | "long") => string;
  formatDateRange: (start: Date | string, end: Date | string) => string;
}

const CURRENCY_MAP: Record<string, string> = {
  GB: "GBP",
  US: "USD",
  PT: "EUR",
  CV: "CVE",
  IE: "EUR",
};

const INTL_LOCALE_MAP: Record<Locale, string> = {
  en: "en-GB",
  "pt-PT": "pt-PT",
};

function createFormatters(locale: Locale, country: string | null): LocaleFormats {
  const intlLocale = INTL_LOCALE_MAP[locale] || "en-GB";
  const currency = CURRENCY_MAP[country || "GB"] || "GBP";

  return {
    locale,
    intlLocale,
    currency,
    formatCurrency: (amount: number) => {
      try {
        return new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toFixed(2)}`;
      }
    },
    formatNumber: (num: number, decimals = 2) => {
      try {
        return new Intl.NumberFormat(intlLocale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num);
      } catch {
        return num.toFixed(decimals);
      }
    },
    formatDate: (date: Date | string, style: "short" | "medium" | "long" = "medium") => {
      const d = typeof date === "string" ? new Date(date) : date;
      const options: Intl.DateTimeFormatOptions =
        style === "short"
          ? { day: "2-digit", month: "2-digit", year: "numeric" }
          : style === "long"
          ? { day: "numeric", month: "long", year: "numeric" }
          : { day: "numeric", month: "short", year: "numeric" };
      try {
        return new Intl.DateTimeFormat(intlLocale, options).format(d);
      } catch {
        return d.toLocaleDateString();
      }
    },
    formatDateRange: (start: Date | string, end: Date | string) => {
      const s = typeof start === "string" ? new Date(start) : start;
      const e = typeof end === "string" ? new Date(end) : end;
      const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      try {
        const fs = new Intl.DateTimeFormat(intlLocale, opts).format(s);
        const fe = new Intl.DateTimeFormat(intlLocale, { ...opts, year: "numeric" }).format(e);
        return `${fs} – ${fe}`;
      } catch {
        return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
      }
    },
  };
}

// ─── Deep get helper ───
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

// ─── Context ───
interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  fmt: LocaleFormats;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { tenantCountry } = useTenant();

  // Resolution order:
  // 1. User preference (localStorage)
  // 2. Tenant default language (from tenant country)
  // 3. Browser/device locale
  // 4. English fallback
  const tenantLocale = LOCALE_MAP[tenantCountry || ""] || null;

  const browserLocale = useMemo((): Locale | null => {
    try {
      const lang = navigator.language || "";
      if (lang.startsWith("pt")) return "pt-PT";
      if (lang.startsWith("en")) return "en";
    } catch {}
    return null;
  }, []);

  // Allow user override stored in localStorage
  const [userLocale, setUserLocale] = useState<Locale | null>(() => {
    const stored = localStorage.getItem("uglo_locale");
    return stored && (stored === "en" || stored === "pt-PT") ? (stored as Locale) : null;
  });

  const locale = userLocale || tenantLocale || browserLocale || "en";

  const setLocale = useCallback((l: Locale) => {
    setUserLocale(l);
    localStorage.setItem("uglo_locale", l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[locale], key);
      // Fallback to English
      if (!value) value = getNestedValue(translations.en, key);
      if (!value) return key;

      // Replace {{param}} tokens
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value!.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        });
      }
      return value;
    },
    [locale]
  );

  const fmt = useMemo(() => createFormatters(locale, tenantCountry), [locale, tenantCountry]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, fmt }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/**
 * Hook for just the formatting utilities (no translations needed).
 */
export function useLocaleFormat() {
  const { fmt } = useI18n();
  return fmt;
}
