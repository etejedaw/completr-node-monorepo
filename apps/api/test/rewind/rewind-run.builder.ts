import { type RewindYearVisibility } from "../../src/rewind/rewind-record.interface";
import { type RewindStoredView } from "../../src/rewind/rewind-record.types";
import {
	type RewindCalendar,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";

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
		createdAt: "2026-01-01",
		notes: null,
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

export function calendarOn(today: Date, firstYear = 2000): RewindCalendar {
	return { today, firstYear };
}

export function ownerVisibility(
	generatedYears: number[] = []
): RewindYearVisibility {
	return {
		generatedYears: new Set(generatedYears),
		includeUngenerated: true
	};
}

export function visitorVisibility(
	generatedYears: number[]
): RewindYearVisibility {
	return {
		generatedYears: new Set(generatedYears),
		includeUngenerated: false
	};
}

export function storedView(
	overrides: Partial<RewindStoredView> = {}
): RewindStoredView {
	return {
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: null,
		...overrides
	};
}
