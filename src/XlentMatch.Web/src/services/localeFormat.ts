import type { Locale } from "../i18n";

const localeMap: Record<Locale, string> = { en: "en-US", sv: "sv-SE", es: "es-ES" };

export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMap[locale], { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMap[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
