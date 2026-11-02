const MAX_RELEASE_YEAR_GAP = 1;

export function isReleaseYearMismatch(
	gameReleaseAt: Date | string | null | undefined,
	detailReleaseYear: number | null
) {
	if (!gameReleaseAt || detailReleaseYear === null) return false;
	const gameYear = new Date(gameReleaseAt).getUTCFullYear();
	if (!Number.isFinite(gameYear)) return false;
	return Math.abs(gameYear - detailReleaseYear) > MAX_RELEASE_YEAR_GAP;
}
