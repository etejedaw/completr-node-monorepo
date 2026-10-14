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

export type FavoriteReorderAction = "earlier" | "first" | "later";

interface ReorderButton {
	id: FavoriteReorderAction;
	icon: string;
	label: string;
	disabled: boolean;
}

@Component({
	selector: "app-favorite-reorder-card",
	imports: [CdkDragHandle, GamePoster],
	template: `
		<div class="flex flex-col gap-1.5">
			<div
				class="relative rounded-lg overflow-hidden bg-surface shadow-lg shadow-black/40 transition-shadow duration-200"
				[class]="
					isFirst() ? 'ring-2 ring-brand' : 'ring-1 ring-white/10'
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
					class="absolute bottom-1.5 left-2.5 font-display text-4xl font-bold leading-none text-white tabular-nums drop-shadow-lg"
					>{{ position() }}</span
				>
				@if (isFirst()) {
					<span
						class="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-brand-solid shadow-md shadow-black/40"
					>
						<span
							aria-hidden="true"
							class="material-icons text-[0.75rem]"
							>person</span
						>
						On profile
					</span>
				}
				<span
					cdkDragHandle
					aria-hidden="true"
					title="Drag to reorder"
					class="absolute top-1 right-1 w-[32px] h-[32px] tap:w-[44px] tap:h-[44px] inline-flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none transition hover:bg-black/80"
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
						type="button"
						class="h-[36px] tap:min-h-[44px] inline-flex items-center justify-center bg-transparent border-0 border-line text-fg-muted cursor-pointer transition hover:text-fg hover:bg-surface-hover active:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-fg-muted"
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
