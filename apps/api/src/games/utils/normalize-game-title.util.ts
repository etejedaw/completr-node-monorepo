import { stripDiacritics } from "./strip-diacritics.util";

const APOSTROPHES = /['’‘`]/g;
const NON_ALPHANUMERIC_RUNS = /[^\p{L}\p{N}]+/gu;

export function normalizeGameTitle(title: string) {
	return stripDiacritics(title.toLowerCase())
		.replace(APOSTROPHES, "")
		.replace(NON_ALPHANUMERIC_RUNS, " ")
		.trim();
}
