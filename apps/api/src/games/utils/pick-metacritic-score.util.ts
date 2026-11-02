const METASCORE_MAX = 100;
const USER_SCORE_MAX = 10;
const USER_SCORE_TO_SCALE_100 = 10;

function withinRange(value: number | null, max: number) {
	return value !== null &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= max
		? value
		: null;
}

export function pickMetacriticScore(
	metaScore: number | null,
	userScore: number | null
) {
	const validUserScore = withinRange(userScore, USER_SCORE_MAX);
	const available = [
		withinRange(metaScore, METASCORE_MAX),
		validUserScore === null
			? null
			: validUserScore * USER_SCORE_TO_SCALE_100
	].filter(score => score !== null);
	if (available.length === 0) return null;
	return Math.round(Math.max(...available));
}
