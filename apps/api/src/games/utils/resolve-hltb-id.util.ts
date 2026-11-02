import { type HltbIdCandidate } from "../games-external-data.interface";
import { type HltbIdResolution } from "../games-external-data.types";
import { isReleaseYearMismatch } from "./is-release-year-mismatch.util";
import { normalizeGameTitle } from "./normalize-game-title.util";

interface HltbIdGame {
	title: string;
	code?: string | null;
	releaseAt?: Date | string | null;
}

export function resolveHltbId(
	game: HltbIdGame,
	candidates: readonly HltbIdCandidate[]
): HltbIdResolution {
	const rawgSlug = game.code?.trim();
	const slugIds = distinctHltbIds(
		candidates.filter(
			candidate => rawgSlug && candidate.rawgSlug === rawgSlug
		)
	);
	if (slugIds.length === 1)
		return {
			status: "resolved",
			hltbId: slugIds[0]!,
			matchedBy: "rawg_slug"
		};

	const title = normalizeGameTitle(game.title);
	const labelIds = distinctHltbIds(
		candidates.filter(
			candidate =>
				candidate.label !== null &&
				normalizeGameTitle(candidate.label) === title &&
				!isReleaseYearMismatch(game.releaseAt, candidate.releaseYear)
		)
	);
	if (labelIds.length === 1)
		return { status: "resolved", hltbId: labelIds[0]!, matchedBy: "label" };
	if (labelIds.length > 1) return { status: "ambiguous" };
	return { status: "not_found" };
}

function distinctHltbIds(candidates: readonly HltbIdCandidate[]) {
	return [...new Set(candidates.map(candidate => candidate.hltbId))];
}
