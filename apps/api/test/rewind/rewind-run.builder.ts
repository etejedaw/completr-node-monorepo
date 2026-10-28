import { type RewindRun } from "../../src/rewind/rewind-run.interface";

let sequence = 0;

export function nextRunId() {
	sequence += 1;
	return `run-${String(sequence).padStart(4, "0")}`;
}

export function buildRun(
	gameCode: string,
	overrides: Partial<RewindRun> = {}
): RewindRun {
	return {
		id: nextRunId(),
		gameId: `id-${gameCode}`,
		status: "completed",
		startedAt: null,
		finishedAt: null,
		realDuration: null,
		duration: null,
		score: null,
		userRating: null,
		game: {
			gameId: `id-${gameCode}`,
			code: gameCode,
			title: gameCode.toUpperCase(),
			coverUrl: `https://img.test/${gameCode}.jpg`,
			backgroundUrl: `https://img.test/${gameCode}-bg.jpg`
		},
		platform: { name: "Switch", abbreviation: "NSW" },
		...overrides
	};
}

export function finishedRun(
	gameCode: string,
	finishedAt: string,
	overrides: Partial<RewindRun> = {}
): RewindRun {
	return buildRun(gameCode, {
		status: "completed",
		finishedAt,
		...overrides
	});
}
