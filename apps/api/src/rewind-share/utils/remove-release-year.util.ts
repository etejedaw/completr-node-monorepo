const TRAILING_RELEASE_YEAR = /\s*\(\d{4}\)$/;

export function removeReleaseYear(title: string): string {
	return title.replace(TRAILING_RELEASE_YEAR, "");
}
