import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { UiIconButton } from "../../ui";

export interface QueueGridGame {
	id?: string;
	code: string;
	title: string;
	backgroundUrl?: string;
}

export interface QueueGridEntry {
	game: QueueGridGame;
	platformAbbreviation?: string;
	ratio?: number | null;
	duration?: number | null;
}

export type QueueStatusChange = "playing";

@Component({
	selector: "app-queue-grid-card",
	standalone: true,
	imports: [RouterLink, UiIconButton],
	template: `
		<div class="flex flex-col gap-1.5 group">
			<div class="block relative">
				<a [routerLink]="['/games', entry().game.code]" class="block">
					@if (entry().game.backgroundUrl) {
						<img
							[src]="entry().game.backgroundUrl"
							[alt]="entry().game.title"
							class="w-full aspect-[3/4] object-cover rounded-lg shadow-lg shadow-black/40 transition-transform group-hover:scale-[1.03]" loading="lazy"
						/>
					} @else {
						<div class="w-full aspect-[3/4] bg-surface rounded-lg"></div>
					}
				</a>
				<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-black/70 backdrop-blur-sm pointer-events-none">
					#{{ position() }}
				</span>
				<div class="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
					@if (entry().ratio) {
						<span class="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-brand/85 backdrop-blur-sm">
							{{ entry().ratio }}
						</span>
					}
					@if (entry().duration) {
						<span class="px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm">
							{{ entry().duration }}h
						</span>
					}
				</div>
				@if (showActions()) {
					<div
						class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition pointer-events-none group-hover:pointer-events-auto pointer-coarse:pointer-events-auto"
					>
						<button
							type="button"
							class="flex items-center justify-center w-10 h-10 rounded-full bg-warning text-white shadow-lg shadow-warning/40 ring-2 ring-white/20 hover:scale-110 hover:bg-warning hover:shadow-warning/60 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
							(click)="statusChange.emit('playing')"
							[disabled]="statusUpdating()"
							title="Mark as playing"
						>
							<span class="material-icons text-xl">play_arrow</span>
						</button>
					</div>
				}
			</div>
			<a
				class="text-xs font-medium text-fg-secondary truncate no-underline hover:text-brand"
				[routerLink]="['/games', entry().game.code]"
			>{{ entry().game.title }}</a>
			<div class="flex items-center justify-between gap-1">
				<div class="flex items-center gap-1.5 min-w-0">
					<button
						type="button"
						class="bg-transparent border-0 cursor-pointer p-0 inline-flex items-center justify-center transition"
						[class.text-warning]="isFavorite()"
						[class.text-fg-muted]="!isFavorite()"
						[class.hover:text-warning]="!isFavorite()"
						(click)="favoriteToggle.emit()"
						[title]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
					>
						<span class="material-icons text-base leading-none">{{ isFavorite() ? 'star' : 'star_border' }}</span>
					</button>
					<span class="text-[0.625rem] text-fg-muted truncate">
						{{ entry().platformAbbreviation ?? '' }}
					</span>
				</div>
				@if (showActions()) {
					<div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 pointer-coarse:opacity-100 transition">
						<button
							uiIconButton size="sm"
							[disabled]="isFirst()"
							(click)="moveUp.emit()"
							title="Move up"
						>
							<span class="material-icons text-base">keyboard_arrow_up</span>
						</button>
						<button
							uiIconButton size="sm"
							[disabled]="isLast()"
							(click)="moveDown.emit()"
							title="Move down"
						>
							<span class="material-icons text-base">keyboard_arrow_down</span>
						</button>
						<button
							uiIconButton size="sm" tone="danger"
							(click)="remove.emit()"
							title="Remove"
						>
							<span class="material-icons text-base">close</span>
						</button>
					</div>
				}
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueGridCard {
	entry = input.required<QueueGridEntry>();
	position = input.required<number>();
	showActions = input<boolean>(false);
	isFirst = input<boolean>(false);
	isLast = input<boolean>(false);
	statusUpdating = input<boolean>(false);
	isFavorite = input<boolean>(false);

	moveUp = output<void>();
	moveDown = output<void>();
	remove = output<void>();
	statusChange = output<QueueStatusChange>();
	favoriteToggle = output<void>();
}
