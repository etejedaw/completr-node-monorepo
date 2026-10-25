import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type Game } from "../../../../core/models";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import { type CanonicalScore } from "../../../../shared/utils/canonical-score";

export interface GameFact {
	label: string;
	value: string;
	unit?: string;
	valueClass?: string;
}

const SCORE_TYPE_LABELS: Record<NonNullable<CanonicalScore["type"]>, string> = {
	completr: "Completr ratio",
	aggregate: "Provisional ratio",
	rawg: "RAWG ratio"
};

const SCORE_TYPE_DESCRIPTIONS: Record<
	NonNullable<CanonicalScore["type"]>,
	string
> = {
	completr: "Completr ratio, from community ratings and play time",
	aggregate: "Provisional ratio, from Metacritic and HowLongToBeat",
	rawg: "Fallback ratio, from RAWG community data"
};

const SCORE_TYPE_CLASSES: Record<
	NonNullable<CanonicalScore["type"]>,
	string
> = {
	completr: "text-brand border-brand/40 bg-brand-subtle",
	aggregate: "text-info border-info/40 bg-info/10",
	rawg: "text-fg-secondary border-line-hover bg-fg-muted/10"
};

@Component({
	selector: "app-game-hero",
	imports: [NgTemplateOutlet, RouterLink, GamePoster, CoverUrlPipe],
	templateUrl: "./game-hero.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameHero {
	readonly game = input.required<Game>();
	readonly score = input.required<CanonicalScore>();
	readonly facts = input<GameFact[]>([]);
	readonly isLoggedIn = input(false);
	readonly franchiseTracked = input(false);
	readonly togglingFranchise = input(false);
	readonly platinumed = input(false);

	readonly franchiseTrackToggled = output<void>();

	protected readonly backdrop = computed(
		() => this.game().backgroundUrl ?? this.game().coverUrl ?? null
	);
	protected readonly poster = computed(
		() => this.game().coverUrl ?? this.game().backgroundUrl ?? null
	);
	protected readonly platformsLabel = computed(() =>
		this.game()
			.platforms.map(platform => platform.abbreviation)
			.join(", ")
	);
	protected readonly releaseYear = computed(() =>
		this.game().releaseAt?.slice(0, 4)
	);
	protected readonly scoreLabel = computed(() => {
		const type = this.score().type;
		return type ? SCORE_TYPE_LABELS[type] : "";
	});
	protected readonly scoreDescription = computed(() => {
		const type = this.score().type;
		return type ? SCORE_TYPE_DESCRIPTIONS[type] : "";
	});
	protected readonly scoreClass = computed(() => {
		const type = this.score().type;
		return type ? SCORE_TYPE_CLASSES[type] : "";
	});
}
