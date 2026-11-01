import { stripDiacritics } from "./strip-diacritics.util";

const APOSTROPHES = /['’‘`]/g;
const NON_SLUG_RUNS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export function deriveMetacriticSlug(title: string) {
	return stripDiacritics(title.toLowerCase())
		.replace(APOSTROPHES, "")
		.replaceAll("&", "-")
		.replace(NON_SLUG_RUNS, "-")
		.replace(EDGE_DASHES, "");
}
