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
	type RewindGenre,
	type RewindHighlights,
	type RewindLanguage,
	type RewindPlatform,
	type RewindRatioGame
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { UiEyebrow } from "../../../../../shared/ui";
import {
	formatHours,
	formatRewindNumber,
	monthName,
	monthRange,
	rewindCopy,
	shortDate,
	shortMonthName,
	spokenMonthRange
} from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import {
	type Rewind2025Award,
	type Rewind2025AwardKey,
	type Rewind2025Figure
} from "./rewind-2025-awards.model";

export const MAX_AWARD_COLUMNS = 6;
const RUNNER_UP_GENRES = 2;

function isSameGame(
	first: RewindFinishedGame | null,
	second: RewindFinishedGame | null
): boolean {
	return !!first && !!second && first.gameId === second.gameId;
}

function listOf(items: string[], language: RewindLanguage): string {
	return new Intl.ListFormat(language, {
		style: "long",
		type: "conjunction"
	}).format(items);
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

function genreFigure(
	genres: RewindGenre[],
	language: RewindLanguage
): Rewind2025Figure | null {
	const [favorite, ...rest] = genres;
	if (!favorite) return null;
	const copy = rewindDesign2025Copy(language);
	const runnersUp = rest.slice(0, RUNNER_UP_GENRES).map(genre => genre.name);
	return {
		key: "favoriteGenre",
		label: copy.favoriteGenre,
		value: formatRewindNumber(favorite.count, language),
		spokenValue: null,
		unit: copy.gamesNoun(favorite.count),
		detail:
			runnersUp.length > 0
				? `${favorite.name} · ${copy.thenGenres(listOf(runnersUp, language))}`
				: favorite.name,
		spokenDetail: null
	};
}

function platformFigure(
	platforms: RewindPlatform[],
	language: RewindLanguage
): Rewind2025Figure | null {
	const [main, ...others] = platforms;
	if (!main) return null;
	const copy = rewindDesign2025Copy(language);
	const otherRuns = others.map(platform =>
		copy.platformRuns(
			formatRewindNumber(platform.count, language),
			platform.name
		)
	);
	return {
		key: "platform",
		label: copy.platform,
		value: formatRewindNumber(main.count, language),
		spokenValue: null,
		unit: copy.runsNoun(main.count),
		detail:
			otherRuns.length > 0
				? `${main.name} · ${listOf(otherRuns, language)}`
				: main.name,
		spokenDetail: null
	};
}

export function rewind2025Figures(
	highlights: RewindHighlights,
	language: RewindLanguage
): Rewind2025Figure[] {
	const text = rewindCopy(language).highlights;
	const copy = rewindDesign2025Copy(language);
	const { longestStreak, busiestMonth } = highlights;
	return [
		longestStreak
			? {
					key: "longestStreak" as const,
					label: text.longestStreak,
					value: formatRewindNumber(longestStreak.months, language),
					spokenValue: null,
					unit: copy.monthsNoun(longestStreak.months),
					detail: monthRange(
						longestStreak.fromMonth,
						longestStreak.toMonth,
						language
					),
					spokenDetail: spokenMonthRange(
						longestStreak.fromMonth,
						longestStreak.toMonth,
						language
					)
				}
			: null,
		busiestMonth
			? {
					key: "busiestMonth" as const,
					label: text.busiestMonth,
					value: shortMonthName(busiestMonth.month, language),
					spokenValue: monthName(busiestMonth.month, language),
					unit: null,
					detail: text.gamesFinished(busiestMonth.count),
					spokenDetail: null
				}
			: null,
		genreFigure(
			rankedOrFallback(highlights.topGenres, highlights.favoriteGenre),
			language
		),
		platformFigure(
			rankedOrFallback(highlights.topPlatforms, highlights.topPlatform),
			language
		)
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

	protected readonly awardColumns = computed(() =>
		Math.min(this.awards().length, MAX_AWARD_COLUMNS)
	);
}
