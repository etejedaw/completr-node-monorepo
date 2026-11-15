import { type RewindYearVisibility } from "../../src/rewind/rewind-record.interface";
import { type RewindStoredView } from "../../src/rewind/rewind-record.types";
import {
	type RewindCalendar,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { type RewindEditionRecord } from "../../src/rewind-editions/rewind-editions.interface";

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
		releaseYear: null,
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

export function editionOf(
	year: number,
	overrides: Partial<RewindEditionRecord> = {}
): RewindEditionRecord {
	return {
		year,
		opensAt: `${year}-12-01`,
		closesAt: `${year + 1}-01-31`,
		graceStartsAt: `${year + 1}-01-01`,
		graceEndsAt: `${year + 1}-01-07`,
		design: "2026",
		premiumRegenerations: 0,
		giftRegenerations: 0,
		frozenAt: null,
		...overrides
	};
}

function standardEditionOpenedBy(today: Date): RewindEditionRecord {
	const year = today.getUTCFullYear();
	return editionOf(today.getUTCMonth() === 11 ? year : year - 1);
}

export function calendarOn(
	today: Date,
	firstYear = 2000,
	edition: RewindEditionRecord | null = standardEditionOpenedBy(today),
	upcomingEdition: RewindEditionRecord | null = null
): RewindCalendar {
	return { today, firstYear, edition, upcomingEdition };
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
		frozenAt: null,
		aiRecap: null,
		premiumStats: null,
		premiumAccessKind: null,
		ownerControls: null,
		...overrides
	};
}
