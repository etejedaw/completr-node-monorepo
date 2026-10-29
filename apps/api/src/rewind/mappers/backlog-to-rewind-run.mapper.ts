import { type Backlog } from "../../backlog/backlog.model";
import { type RewindRun } from "../rewind-run.interface";

function toDateOnly(value: Date | string | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return value.slice(0, 10);
}

function toNumberOrNull(value: number | null | undefined): number | null {
	return value === null || value === undefined ? null : Number(value);
}

function toYearOrNull(value: Date | string | null | undefined): number | null {
	const date = toDateOnly(value);
	if (date === null) return null;
	const year = Number(date.slice(0, 4));
	return Number.isInteger(year) ? year : null;
}

export function backlogToRewindRun(run: Backlog): RewindRun {
	return {
		id: run.id,
		gameId: run.gameId,
		status: run.status,
		startedAt: toDateOnly(run.startedAt),
		finishedAt: toDateOnly(run.finishedAt),
		realDuration: toNumberOrNull(run.realDuration),
		duration: toNumberOrNull(run.duration),
		score: toNumberOrNull(run.score),
		userRating: toNumberOrNull(run.userRating),
		createdAt: run.createdAt.toISOString().slice(0, 10),
		notes: run.notes ?? null,
		releaseYear: toYearOrNull(run.Game.releaseAt),
		game: {
			gameId: run.Game.id,
			code: run.Game.code,
			title: run.Game.title,
			coverUrl: run.Game.coverUrl ?? null,
			backgroundUrl: run.Game.backgroundUrl ?? null
		},
		platform: run.Platform
			? {
					name: run.Platform.name,
					abbreviation: run.Platform.abbreviation
				}
			: null
	};
}
