import { i18n } from "astro:config/client";

export type Locale = "es" | "en";

export const localeNames: Record<Locale, string> = {
	es: "Español",
	en: "English"
};

export const locales = (i18n?.locales ?? []).map(locale =>
	typeof locale === "string" ? locale : locale.path
) as Locale[];

export function isLocale(value: string | undefined): value is Locale {
	return locales.some(locale => locale === value);
}

export function toLocale(value: string | undefined): Locale {
	if (!isLocale(value)) {
		throw new Error(`Unsupported locale "${value}"`);
	}
	return value;
}

export function getLocaleStaticPaths() {
	return locales.map(lang => ({ params: { lang } }));
}

export function pathWithoutLocale(pathname: string, locale: Locale): string {
	return pathname.replace(new RegExp(`^/${locale}(?:/|$)`), "");
}
