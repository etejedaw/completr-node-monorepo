import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type GameRowLookups } from "../rewind-recap.interface";
import { type GameRow } from "../rewind-recap.types";
import { condenseRecapNote } from "./condense-recap-note.util";
import { daysInBacklog } from "./days-in-backlog.util";
import { daysToFinish } from "./days-to-finish.util";
import { lengthRangeOf } from "./length-range-of.util";
import { paceVsEstimate } from "./pace-vs-estimate.util";
import { ratingVsCritics } from "./rating-vs-critics.util";
import { toDateOnly } from "./to-date-only.util";

export function toGameRow(
	run: RewindRun,
	lookups: GameRowLookups,
	includesNotes: boolean
): GameRow {
	const row: GameRow = [
		run.game.title,
		run.status,
		toDateOnly(run.startedAt),
		toDateOnly(run.finishedAt),
		run.platform?.abbreviation ?? null,
		lookups.genreNamesByGame.get(run.gameId)?.join("/") ?? null,
		lookups.franchiseNamesByGame.get(run.gameId)?.join("/") ?? null,
		run.realDuration,
		run.duration,
		lengthRangeOf(run),
		paceVsEstimate(run),
		run.userRating,
		run.score,
		ratingVsCritics(run),
		daysInBacklog(run),
		daysToFinish(run),
		lookups.coopAliasesByRun.get(run.id)?.join("/") ?? null,
		condenseRecapNote(lookups.reviewsByGame.get(run.gameId) ?? null)
	];
	return includesNotes ? [...row, condenseRecapNote(run.notes)] : row;
}
