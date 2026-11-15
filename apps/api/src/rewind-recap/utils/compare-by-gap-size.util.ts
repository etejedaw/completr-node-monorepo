import { type RewindCriticGap } from "../../rewind/rewind.interface";
import { compareText } from "../../rewind/utils/compare-text.util";

export function compareByGapSize(
	first: RewindCriticGap,
	second: RewindCriticGap
) {
	return (
		Math.abs(second.gap) - Math.abs(first.gap) ||
		compareText(first.title, second.title) ||
		compareText(first.gameId, second.gameId)
	);
}
