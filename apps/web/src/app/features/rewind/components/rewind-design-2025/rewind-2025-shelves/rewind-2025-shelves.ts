import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindClosedGame,
	type RewindLanguage
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { UiEyebrow } from "../../../../../shared/ui";
import {
	monthRange,
	rewindCopy,
	shortDate,
	spokenMonthRange,
	utcMonth
} from "../../../rewind-copy";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import { type RewindQuarterShelf } from "./rewind-2025-shelves.model";

const MONTHS_PER_QUARTER = 3;

function quarterOf(isoDate: string): number | null {
	const month = utcMonth(isoDate);
	if (!Number.isInteger(month) || month < 1 || month > 12) return null;
	return Math.ceil(month / MONTHS_PER_QUARTER);
}

function byFinishedAt(a: RewindClosedGame, b: RewindClosedGame): number {
	return a.finishedAt.localeCompare(b.finishedAt);
}

export function rewindQuarterShelves(
	games: RewindClosedGame[],
	language: RewindLanguage
): RewindQuarterShelf[] {
	const quarters = new Map<number, RewindClosedGame[]>();
	for (const game of games) {
		const quarter = quarterOf(game.finishedAt);
		if (quarter === null) continue;
		quarters.set(quarter, [...(quarters.get(quarter) ?? []), game]);
	}
	const gamesLabel = rewindCopy(language).highlights.games;
	const copy = rewindDesign2025Copy(language);
	return [...quarters.entries()]
		.sort(([a], [b]) => a - b)
		.map(([quarter, quarterGames]) => {
			const fromMonth = (quarter - 1) * MONTHS_PER_QUARTER + 1;
			const toMonth = fromMonth + MONTHS_PER_QUARTER - 1;
			return {
				quarter,
				label: copy.quarter(quarter),
				range: monthRange(fromMonth, toMonth, language),
				spokenRange: spokenMonthRange(fromMonth, toMonth, language),
				count: quarterGames.length,
				countLabel: gamesLabel(quarterGames.length),
				games: [...quarterGames].sort(byFinishedAt)
			};
		});
}

@Component({
	selector: "app-rewind-2025-shelves",
	imports: [GamePoster, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2025-shelves.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025Shelves {
	readonly games = input.required<RewindClosedGame[]>();
	readonly language = input<RewindLanguage>("en");
	protected readonly shelves = computed(() =>
		rewindQuarterShelves(this.games(), this.language())
	);

	protected readonly copy = computed(() =>
		rewindDesign2025Copy(this.language())
	);

	protected dateOf(game: RewindClosedGame): string {
		return shortDate(game.finishedAt, this.language());
	}
}
