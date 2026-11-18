import { isLocale, type Locale } from "./locales";

const fallbackLocale: Locale = "en";

export function preferredLocale(languages: readonly string[]): Locale {
	const primarySubtags = languages.map(
		language => language.toLowerCase().split("-")[0]
	);
	return primarySubtags.find(isLocale) ?? fallbackLocale;
}
