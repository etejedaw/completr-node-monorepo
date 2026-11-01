const COMBINING_MARKS = /\p{M}/gu;

export function stripDiacritics(text: string) {
	return text.normalize("NFD").replace(COMBINING_MARKS, "");
}
