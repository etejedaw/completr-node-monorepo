// Matches "propónte", "Pónte", "deténte" or "manténte"; leaves "atrévete" alone.
const ACCENTED_TWO_SYLLABLE_IMPERATIVE =
	/(?<![\p{L}])((?:pro|com|dis|im|ex|su|re)?p|(?:de|man|con|ob|re|sos)?t)([óé])(n)(te)(?![\p{L}])/giu;

const UNACCENTED_VOWEL: Record<string, string> = {
	ó: "o",
	Ó: "O",
	é: "e",
	É: "E"
};

export function fixSpanishImperativeAccents(text: string): string {
	return text.replace(
		ACCENTED_TWO_SYLLABLE_IMPERATIVE,
		(_match, stem: string, vowel: string, nasal: string, pronoun: string) =>
			`${stem}${UNACCENTED_VOWEL[vowel] ?? vowel}${nasal}${pronoun}`
	);
}
