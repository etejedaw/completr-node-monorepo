const COMBINING_DIACRITICS = /[̀-ͯ]/g;
const WHITESPACE_RUNS = /\s+/g;

export function normalizeTag(input: string): string {
	return input
		.normalize("NFD")
		.replace(COMBINING_DIACRITICS, "")
		.trim()
		.toLowerCase()
		.replace(WHITESPACE_RUNS, " ");
}
