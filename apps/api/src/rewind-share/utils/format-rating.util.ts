export function formatRating(rating: number, locale: string): string {
	return rating.toLocaleString(locale, { maximumFractionDigits: 1 });
}
