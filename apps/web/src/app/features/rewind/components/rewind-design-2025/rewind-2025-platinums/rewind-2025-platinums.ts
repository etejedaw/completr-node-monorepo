import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindLanguage,
	type RewindPlatinumGame
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { UiEyebrow } from "../../../../../shared/ui";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import { formatRewindNumber, shortDate } from "../../../rewind-copy";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import { type Rewind2025PlatinumEntry } from "./rewind-2025-platinums.model";

const POSITION_DIGITS = 2;

export function rewind2025PlatinumEntries(
	games: RewindPlatinumGame[],
	language: RewindLanguage
): Rewind2025PlatinumEntry[] {
	const copy = rewindDesign2025Copy(language);
	return games.map((game, index) => {
		const date = shortDate(game.platinumedAt, language);
		return {
			gameId: game.gameId,
			code: game.code,
			title: game.title,
			position: String(index + 1).padStart(POSITION_DIGITS, "0"),
			date,
			label: copy.platinumGameLabel(game.title, date),
			posterUrl: gameArtUrl(game, "portrait")
		};
	});
}

@Component({
	selector: "app-rewind-2025-platinums",
	imports: [GamePoster, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2025-platinums.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025Platinums {
	readonly games = input.required<RewindPlatinumGame[]>();
	readonly language = input<RewindLanguage>("en");

	protected readonly headingId = "rewind-2025-platinums-heading";

	protected readonly copy = computed(() =>
		rewindDesign2025Copy(this.language())
	);
	protected readonly entries = computed(() =>
		rewind2025PlatinumEntries(this.games(), this.language())
	);
	protected readonly total = computed(() =>
		formatRewindNumber(this.games().length, this.language())
	);
}
