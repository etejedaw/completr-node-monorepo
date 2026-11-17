import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindLanguage,
	type RewindRatedGame
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { ProfileSectionHeader } from "../../../../../shared/components/profile-section-header/profile-section-header";
import { StarRating } from "../../../../../shared/components/star-rating/star-rating";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import { rewindCopy } from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import {
	TONE_ACCENT_CAPSULE_CLASS,
	TONE_ACCENT_CARD_CLASS,
	toneVar
} from "../../../rewind-tone";

const ARTWORK_CLASS =
	"absolute inset-0 -z-20 size-full object-cover opacity-55 saturate-80 transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]";
const VEIL_CLASS =
	"absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-surface)_92%,transparent)_20%,color-mix(in_oklab,var(--color-surface)_45%,transparent)_70%,transparent)]";

@Component({
	selector: "app-rewind-2026-game-of-the-year",
	imports: [
		CoverUrlPipe,
		GamePoster,
		ProfileSectionHeader,
		RewindReveal,
		RouterLink,
		StarRating
	],
	templateUrl: "./rewind-2026-game-of-the-year.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026GameOfTheYear {
	readonly game = input.required<RewindRatedGame>();
	readonly language = input<RewindLanguage>("en");

	protected readonly page = computed(() => rewindCopy(this.language()).page);
	protected readonly highlightsCopy = computed(
		() => rewindCopy(this.language()).highlights
	);
	protected readonly artUrl = computed(() =>
		gameArtUrl(this.game(), "landscape")
	);
	protected readonly posterUrl = computed(() =>
		gameArtUrl(this.game(), "portrait")
	);

	protected readonly tone = toneVar("brand");
	protected readonly cardClass = TONE_ACCENT_CARD_CLASS;
	protected readonly capsuleClass = TONE_ACCENT_CAPSULE_CLASS;
	protected readonly artworkClass = ARTWORK_CLASS;
	protected readonly veilClass = VEIL_CLASS;
}
