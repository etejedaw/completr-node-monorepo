import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import {
	SegmentedControl,
	type SegmentedOption
} from "../../../shared/components/segmented-control/segmented-control";
import { UiSkeleton } from "../../../shared/ui";
import {
	type ComparisonDimension,
	type ComparisonGame
} from "../services/public-library.service";
import { ProfileSectionHeader } from "./profile-section-header";

const SKELETON_RANGE = [0, 1, 2, 3, 4, 5];

@Component({
	selector: "app-profile-in-common",
	imports: [
		NgTemplateOutlet,
		GameCoverCard,
		PosterShelf,
		ProfileSectionHeader,
		SegmentedControl,
		UiSkeleton
	],
	template: `
		<ng-template #compareControl>
			<app-segmented-control
				label="Compare by"
				[options]="options()"
				[value]="selected()"
				(valueChange)="selectedChange.emit($event)"
			/>
		</ng-template>

		@if (!loading() && cards().length > 0) {
			<app-poster-shelf
				[contained]="true"
				heading="In common"
				[eyebrow]="'You & @' + username()"
				[seeAllLabel]="'See all ' + count()"
				[seeAllLink]="['/user', username(), 'in-common']"
				[seeAllQueryParams]="{ by: selected() }"
			>
				<span
					shelfHeadingIcon
					class="text-base font-semibold text-brand tabular-nums"
					>{{ count() }}</span
				>
				<div shelfActions class="mr-1">
					<ng-container [ngTemplateOutlet]="compareControl" />
				</div>
				@for (game of cards(); track game.id) {
					<app-game-cover-card class="w-32 sm:w-40" [game]="game" />
				}
			</app-poster-shelf>
		} @else {
			<section aria-labelledby="in-common-heading">
				<app-profile-section-header
					heading="In common"
					headingId="in-common-heading"
					[eyebrow]="'You & @' + username()"
				>
					<ng-container [ngTemplateOutlet]="compareControl" />
				</app-profile-section-header>
				@if (loading()) {
					<div
						class="flex gap-3 sm:gap-4 overflow-hidden"
						aria-busy="true"
					>
						@for (i of skeletonRange; track i) {
							<ui-skeleton
								variant="rect"
								class="block shrink-0 w-32 sm:w-40 aspect-[2/3] rounded-lg"
							/>
						}
					</div>
				} @else {
					<p
						class="m-0 flex items-center gap-3 p-4 rounded-card border border-dashed border-line text-sm text-fg-secondary"
					>
						<span
							aria-hidden="true"
							class="material-icons text-xl text-brand"
							>join_inner</span
						>
						{{
							isPrivate()
								? "This part of their library is private."
								: "Nothing in common here yet. Try the other comparison."
						}}
					</p>
				}
			</section>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileInCommon {
	readonly username = input.required<string>();
	readonly options = input.required<SegmentedOption<ComparisonDimension>[]>();
	readonly selected = input.required<ComparisonDimension>();
	readonly games = input<ComparisonGame[]>([]);
	readonly count = input(0);
	readonly loading = input(false);
	readonly isPrivate = input(false);

	readonly selectedChange = output<ComparisonDimension>();

	protected readonly skeletonRange = SKELETON_RANGE;
	protected readonly cards = computed(() =>
		this.games().map(game => ({
			...game,
			backgroundUrl: game.backgroundUrl ?? undefined
		}))
	);
}
