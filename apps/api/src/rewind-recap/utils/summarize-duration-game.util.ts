import { type RewindDurationGame } from "../../rewind/rewind.interface";

export function summarizeDurationGame(game: RewindDurationGame | null) {
	return (
		game && {
			title: game.title,
			hours: game.hours,
			hoursEstimated: game.isEstimate
		}
	);
}
