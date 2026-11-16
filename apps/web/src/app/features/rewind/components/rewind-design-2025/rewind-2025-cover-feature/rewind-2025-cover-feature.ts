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
import { StarRating } from "../../../../../shared/components/star-rating/star-rating";
import { UiEyebrow } from "../../../../../shared/ui";
import { formatRating } from "../../../rewind-copy";
import { formatRewindDay } from "../../../rewind-dates";
import { RewindReveal } from "../../../rewind-reveal";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";

@Component({
	selector: "app-rewind-2025-cover-feature",
	imports: [GamePoster, RewindReveal, RouterLink, StarRating, UiEyebrow],
	template: `
		<article
			appRewindReveal
			aria-labelledby="rewind-2025-cover-heading"
			class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 @3xl/page:grid-cols-[14rem_minmax(0,1fr)] @3xl/page:gap-10"
		>
			<a
				aria-hidden="true"
				tabindex="-1"
				class="group block"
				[routerLink]="['/games', game().code]"
			>
				<app-game-poster
					class="aspect-[2/3] rounded-card shadow-popover ring-1 ring-line-hover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:-rotate-1"
					[src]="game().coverUrl ?? game().backgroundUrl"
					[title]="game().title"
					[width]="640"
					titleSize="1rem"
				/>
			</a>
			<div class="flex min-w-0 flex-col gap-3">
				<span uiEyebrow tone="brand">{{ copy().coverOfTheYear }}</span>
				<h2
					id="rewind-2025-cover-heading"
					class="m-0 font-display text-2xl font-bold leading-[1.05] tracking-tight text-balance [overflow-wrap:anywhere] sm:text-4xl @3xl/page:text-5xl"
				>
					<a
						class="text-fg no-underline hover:text-brand focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
						[routerLink]="['/games', game().code]"
						>{{ game().title }}</a
					>
				</h2>
				<app-star-rating
					aria-hidden="true"
					[value]="game().userRating"
					[readonly]="true"
					[showValue]="false"
				/>
				<p
					class="m-0 max-w-[52ch] text-sm text-fg-secondary text-pretty sm:text-base"
				>
					{{ summary() }}
				</p>
			</div>
		</article>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025CoverFeature {
	readonly game = input.required<RewindRatedGame>();
	readonly language = input<RewindLanguage>("en");

	protected readonly copy = computed(() =>
		rewindDesign2025Copy(this.language())
	);

	protected readonly summary = computed(() => {
		const game = this.game();
		const language = this.language();
		return this.copy().coverSummary(
			formatRating(game.userRating, language),
			formatRewindDay(game.finishedAt, language)
		);
	});
}
