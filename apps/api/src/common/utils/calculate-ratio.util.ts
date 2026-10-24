const TARGET_SCALE = 100;
const DEFAULT_SOURCE_SCALE = 5;

export const RATIO_SCORE_MULTIPLIER = TARGET_SCALE / DEFAULT_SOURCE_SCALE;

export function calculateRatio(
	score: number | null | undefined,
	duration: number | null | undefined,
	sourceScale: number = DEFAULT_SOURCE_SCALE
) {
	if (!score || !duration) return null;
	const normalized = (score / sourceScale) * TARGET_SCALE;
	return Math.round((normalized / duration) * 100) / 100;
}
