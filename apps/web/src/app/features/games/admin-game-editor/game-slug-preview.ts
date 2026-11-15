const DIACRITICS = /\p{Diacritic}/gu;

export function previewSlug(title: string): string {
	return title
		.normalize("NFD")
		.replace(DIACRITICS, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
