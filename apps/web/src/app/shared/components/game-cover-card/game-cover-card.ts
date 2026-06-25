import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { RouterLink } from "@angular/router";
import { UiIconButton } from "../../ui";
import { MoodTagsChips } from "../mood-tags-chips/mood-tags-chips";

export interface GameCoverCardGame {
	code: string;
	title: string;
	backgroundUrl?: string;
}

@Component({
	selector: "app-game-cover-card",
	imports: [RouterLink, NgTemplateOutlet, DatePipe, UiIconButton, MoodTagsChips],
	template: `
		<div class="flex flex-col gap-1.5 text-inherit group">
			@if (clickable()) {
				<button type="button" class="block relative bg-transparent border-0 p-0 cursor-pointer w-full text-left" (click)="cardClick.emit()">
					<ng-container *ngTemplateOutlet="cover" />
				</button>
			} @else {
				<a class="block relative" [routerLink]="['/games', game().code]">
					<ng-container *ngTemplateOutlet="cover" />
				</a>
			}
			<a class="text-xs font-medium text-fg-secondary truncate no-underline hover:text-brand" [routerLink]="['/games', game().code]">{{ game().title }}</a>
			@if (subtitle()) {
				<span class="text-[0.625rem] text-fg-muted truncate">{{ subtitle() }}</span>
			}
			<app-mood-tags-chips [tags]="moodTags()" />
		</div>

		<ng-template #cover>
			@if (game().backgroundUrl) {
				<img
					[src]="game().backgroundUrl"
					[alt]="game().title"
					class="w-full aspect-[3/4] object-cover rounded-lg shadow-lg shadow-black/40 transition-transform group-hover:scale-[1.03]" loading="lazy"
				/>
			} @else {
				<div class="w-full aspect-[3/4] bg-surface rounded-lg"></div>
			}
			@if (topLeftBadge()) {
				<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-black/70 backdrop-blur-sm">
					{{ topLeftBadge() }}
				</span>
			}
			@if (ratio() != null || duration() != null) {
				<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
					@if (ratio() != null) {
						<span class="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-brand/85 backdrop-blur-sm">{{ ratio() }}</span>
					}
					@if (duration() != null) {
						<span class="px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm">{{ duration() }}h</span>
					}
				</div>
			}
			@if (acquiredAt()) {
				<span class="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm">
					<span class="material-icons text-[0.75rem]">event</span>
					{{ acquiredAt() | date:'yyyy-MM-dd' }}
				</span>
			}
			@if (showRemove()) {
				<button
					uiIconButton
					size="sm"
					tone="danger"
					class="!absolute !top-1 !right-1 !bg-black/60 hover:!bg-black/80 opacity-0 group-hover:opacity-100"
					(click)="$event.preventDefault(); $event.stopPropagation(); remove.emit()"
					title="Remove"
				>&times;</button>
			}
			@if (showFavorite() || showAddToBacklog() || showWishlistToggle()) {
				<div class="absolute bottom-2 right-2 flex flex-col items-end gap-1.5">
					@if (showAddToBacklog()) {
						<button
							type="button"
							class="flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm border-0 cursor-pointer transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
							[class.bg-success]="inBacklog()"
							[class.bg-black\/60]="!inBacklog()"
							[class.hover:bg-black\/80]="!inBacklog()"
							[class.text-white]="true"
							(click)="$event.preventDefault(); $event.stopPropagation(); addToBacklog.emit()"
							[title]="inBacklog() ? 'In your backlog — edit' : 'Add to Backlog'"
							[attr.aria-label]="inBacklog() ? 'Edit backlog entry' : 'Add to Backlog'"
						>
							<span aria-hidden="true" class="material-icons text-[1rem]">{{ inBacklog() ? 'check' : 'playlist_add' }}</span>
						</button>
					}
					@if (showWishlistToggle()) {
						<button
							type="button"
							class="flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm border-0 cursor-pointer transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
							[class.bg-danger]="inWishlist()"
							[class.bg-black\/60]="!inWishlist()"
							[class.hover:bg-black\/80]="!inWishlist()"
							[class.text-white]="true"
							(click)="$event.preventDefault(); $event.stopPropagation(); wishlistToggle.emit()"
							[title]="inWishlist() ? 'Remove from Want to Get' : 'Add to Want to Get'"
							[attr.aria-label]="inWishlist() ? 'Remove from Want to Get' : 'Add to Want to Get'"
						>
							<span aria-hidden="true" class="material-icons text-[1rem]">{{ inWishlist() ? 'favorite' : 'favorite_border' }}</span>
						</button>
					}
					@if (showFavorite()) {
						<button
							type="button"
							class="flex items-center justify-center w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm border-0 cursor-pointer transition hover:bg-black/80"
							[class.text-warning]="isFavorite()"
							[class.text-white]="!isFavorite()"
							(click)="$event.preventDefault(); $event.stopPropagation(); favoriteToggle.emit()"
							[title]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
						>
							<span aria-hidden="true" class="material-icons text-[1.125rem]">{{ isFavorite() ? 'star' : 'star_border' }}</span>
						</button>
					}
				</div>
			}
		</ng-template>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCoverCard {
	game = input.required<GameCoverCardGame>();
	moodTags = input<string[] | null | undefined>();
	topLeftBadge = input<string | undefined>();
	ratio = input<number | null | undefined>();
	duration = input<number | null | undefined>();
	subtitle = input<string | undefined>();
	acquiredAt = input<string | Date | null | undefined>();
	clickable = input<boolean>(false);
	showRemove = input<boolean>(false);
	showFavorite = input<boolean>(false);
	isFavorite = input<boolean>(false);
	showAddToBacklog = input<boolean>(false);
	inBacklog = input<boolean>(false);
	showWishlistToggle = input<boolean>(false);
	inWishlist = input<boolean>(false);
	cardClick = output<void>();
	remove = output<void>();
	favoriteToggle = output<void>();
	addToBacklog = output<void>();
	wishlistToggle = output<void>();
}
