import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindDurationGame,
	type RewindFinishedGame,
	type RewindHighlights,
	type RewindLanguage,
	type RewindRatioGame
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { UiEyebrow } from "../../../../../shared/ui";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import {
	formatHours,
	formatRewindNumber,
	monthName,
	rewindCopy,
	shortDate
} from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import {
	type Rewind2025Award,
	type Rewind2025AwardKey,
	type Rewind2025AwardLayout,
	type Rewind2025Figure
} from "./rewind-2025-awards.model";

export const MIN_AWARD_COLUMNS = 4;
export const MAX_AWARD_COLUMNS = 5;

function isSameGame(
	first: RewindFinishedGame | null,
	second: RewindFinishedGame | null
): boolean {
	return !!first && !!second && first.gameId === second.gameId;
}

function present<T>(value: T | null): value is T {
	return value !== null;
}

export function rewind2025Awards(
	highlights: RewindHighlights,
	language: RewindLanguage
): Rewind2025Award[] {
	const text = rewindCopy(language).highlights;
	const copy = rewindDesign2025Copy(language);
	const { firstFinished, longest, fastest, bestRatio, classic } = highlights;
	const lastFinished = isSameGame(firstFinished, highlights.lastFinished)
		? null
		: highlights.lastFinished;
	const fastestWinsBestValue = isSameGame(fastest, bestRatio);
	const ratioOf = (game: RewindRatioGame) =>
		formatRewindNumber(game.personalRatio, language);
	const hoursUnitOf = (game: RewindDurationGame) =>
		text.hoursSuffix(game.isEstimate);
	const dateAward = (
		key: Rewind2025AwardKey,
		game: RewindFinishedGame,
		label: string
	): Rewind2025Award => ({
		key,
		game,
		label,
		value: shortDate(game.finishedAt, language),
		unit: null
	});
	const durationAward = (
		key: Rewind2025AwardKey,
		game: RewindDurationGame,
		label: string,
		unit: string
	): Rewind2025Award => ({
		key,
		game,
		label,
		value: formatHours(game.hours, language),
		unit
	});
	const fastestAward = (game: RewindDurationGame): Rewind2025Award =>
		fastestWinsBestValue && bestRatio
			? durationAward(
					"fastestAndBestValue",
					game,
					copy.fastestAndBestValue,
					`${hoursUnitOf(game)} · ${copy.ratioUnit} ${ratioOf(bestRatio)}`
				)
			: durationAward("fastest", game, text.fastest, hoursUnitOf(game));

	return [
		firstFinished
			? dateAward("firstFinished", firstFinished, text.firstOfYear)
			: null,
		longest
			? durationAward(
					"longest",
					longest,
					text.longest,
					hoursUnitOf(longest)
				)
			: null,
		fastest ? fastestAward(fastest) : null,
		bestRatio && !fastestWinsBestValue
			? {
					key: "bestRatio" as const,
					game: bestRatio,
					label: text.bestValue,
					value: ratioOf(bestRatio),
					unit: copy.ratioUnit
				}
			: null,
		classic
			? {
					key: "classic" as const,
					game: classic,
					label: text.classic,
					value: String(classic.releaseYear),
					unit: null
				}
			: null,
		lastFinished
			? dateAward("lastFinished", lastFinished, text.lastOfYear)
			: null
	].filter(present);
}

function rankedOrFallback<T>(ranked: T[], fallback: T | null): T[] {
	if (ranked.length > 0) return ranked;
	return fallback ? [fallback] : [];
}

export function layoutRewind2025Awards(
	awards: Rewind2025Award[]
): Rewind2025AwardLayout {
	const lead = awards.find(award => award.key === "longest") ?? awards[0];
	if (!lead) return { lead: null, rest: [] };
	return { lead, rest: awards.filter(award => award !== lead) };
}

export function rewind2025Figures(
	highlights: RewindHighlights,
	language: RewindLanguage
): Rewind2025Figure[] {
	const { facts } = rewindDesign2025Copy(language);
	const { longestStreak, busiestMonth } = highlights;
	const favoriteGenre = rankedOrFallback(
		highlights.topGenres,
		highlights.favoriteGenre
	)[0];
	const mainPlatform = rankedOrFallback(
		highlights.topPlatforms,
		highlights.topPlatform
	)[0];
	return [
		longestStreak
			? {
					key: "longestStreak" as const,
					lead: facts.streak(longestStreak.months),
					tail: ""
				}
			: null,
		busiestMonth
			? {
					key: "busiestMonth" as const,
					lead: monthName(busiestMonth.month, language),
					tail: facts.busiestMonthTail(busiestMonth.count)
				}
			: null,
		favoriteGenre
			? {
					key: "favoriteGenre" as const,
					lead: favoriteGenre.name,
					tail: facts.favoriteGenreTail
				}
			: null,
		mainPlatform
			? {
					key: "platform" as const,
					lead: mainPlatform.name,
					tail: facts.platformTail(mainPlatform.count)
				}
			: null
	].filter(present);
}

export function hasRewind2025Awards(highlights: RewindHighlights): boolean {
	return (
		rewind2025Awards(highlights, "en").length > 0 ||
		rewind2025Figures(highlights, "en").length > 0
	);
}

@Component({
	selector: "app-rewind-2025-awards",
	imports: [GamePoster, RewindReveal, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2025-awards.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025Awards {
	readonly highlights = input.required<RewindHighlights>();
	readonly language = input<RewindLanguage>("en");

	protected readonly awards = computed(() =>
		rewind2025Awards(this.highlights(), this.language())
	);

	protected readonly figures = computed(() =>
		rewind2025Figures(this.highlights(), this.language())
	);

	protected readonly layout = computed(() =>
		layoutRewind2025Awards(this.awards())
	);
	protected readonly awardColumns = computed(() =>
		Math.min(
			Math.max(this.layout().rest.length, MIN_AWARD_COLUMNS),
			MAX_AWARD_COLUMNS
		)
	);
	protected readonly leadArt = computed(() =>
		gameArtUrl(this.layout().lead?.game, "landscape")
	);
}
