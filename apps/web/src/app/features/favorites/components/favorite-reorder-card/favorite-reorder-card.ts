import { CdkDragHandle } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type FavoriteEntry } from "../../../../core/models";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { UiIconButton } from "../../../../shared/ui";
import {
	type FavoriteReorderAction,
	type ReorderButton
} from "./favorite-reorder-card.model";

@Component({
	selector: "app-favorite-reorder-card",
	imports: [CdkDragHandle, GamePoster, UiIconButton],
	template: `
		<div class="flex flex-col gap-1.5">
			<div
				class="relative rounded-lg overflow-hidden bg-surface shadow-card transition-shadow duration-200"
				[class]="
					isFirst() ? 'ring-2 ring-brand' : 'ring-1 ring-line-hover'
				"
			>
				<app-game-poster
					[src]="entry().game.backgroundUrl"
					[title]="entry().game.title"
					[width]="420"
					class="block w-full aspect-[2/3]"
				/>
				<div
					aria-hidden="true"
					class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none"
				></div>
				<span
					aria-hidden="true"
					class="absolute bottom-1.5 left-2.5 font-display text-4xl font-bold leading-none text-on-image tabular-nums drop-shadow-lg"
					>{{ position() }}</span
				>
				@if (isFirst()) {
					<span
						class="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold text-on-image bg-brand-solid shadow-card"
					>
						<span aria-hidden="true" class="material-icons text-xs"
							>person</span
						>
						On profile
					</span>
				}
				<span
					cdkDragHandle
					aria-hidden="true"
					title="Drag to reorder"
					class="absolute top-1 right-1 w-[32px] h-[32px] tap:w-[44px] tap:h-[44px] inline-flex items-center justify-center rounded-full bg-black/60 text-on-image backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none transition hover:bg-black/80"
				>
					<span class="material-icons text-lg">drag_indicator</span>
				</span>
			</div>
			<div
				role="group"
				class="grid grid-cols-3 rounded-lg border border-line bg-surface overflow-hidden"
				[attr.aria-label]="'Position of ' + entry().game.title"
			>
				@for (
					button of buttons();
					track button.id;
					let first = $first
				) {
					<button
						uiIconButton
						size="lg"
						[class.border-l]="!first"
						[attr.data-reorder-action]="button.id"
						[disabled]="button.disabled"
						[attr.aria-label]="button.label"
						[title]="button.label"
						(click)="move.emit(button.id)"
					>
						<span
							aria-hidden="true"
							class="material-icons text-lg"
							>{{ button.icon }}</span
						>
					</button>
				}
			</div>
			<span class="text-xs font-medium text-fg-secondary truncate">{{
				entry().game.title
			}}</span>
		</div>
	`,
	host: { class: "block", "[attr.data-favorite-id]": "entry().game.id" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoriteReorderCard {
	readonly entry = input.required<FavoriteEntry>();
	readonly position = input.required<number>();
	readonly isFirst = input(false);
	readonly isLast = input(false);
	readonly move = output<FavoriteReorderAction>();

	protected readonly buttons = computed<ReorderButton[]>(() => {
		const title = this.entry().game.title;
		return [
			{
				id: "earlier",
				icon: "chevron_left",
				label: `Move ${title} earlier`,
				disabled: this.isFirst()
			},
			{
				id: "first",
				icon: "first_page",
				label: `Make ${title} your #1`,
				disabled: this.isFirst()
			},
			{
				id: "later",
				icon: "chevron_right",
				label: `Move ${title} later`,
				disabled: this.isLast()
			}
		];
	});
}
