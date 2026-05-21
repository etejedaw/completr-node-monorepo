import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { UiIconButton } from "../../ui";

export interface WishlistGridGame {
	code: string;
	title: string;
	backgroundUrl?: string;
}

export interface WishlistGridEntry {
	game: WishlistGridGame;
	platformAbbreviation?: string;
	ratio?: number | null;
	duration?: number | null;
}

@Component({
	selector: "app-wishlist-grid-card",
	standalone: true,
	imports: [RouterLink, UiIconButton],
	template: `
		<div class="flex flex-col gap-1.5 group">
			<a class="block relative" [routerLink]="['/games', entry().game.code]">
				@if (entry().game.backgroundUrl) {
					<img
						[src]="entry().game.backgroundUrl"
						[alt]="entry().game.title"
						class="w-full aspect-[3/4] object-cover rounded-lg shadow-lg shadow-black/40 transition-transform group-hover:scale-[1.03]"
					/>
				} @else {
					<div class="w-full aspect-[3/4] bg-surface rounded-lg"></div>
				}
				<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-black/70 backdrop-blur-sm">
					#{{ position() }}
				</span>
				<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
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
			</a>
			<a
				class="text-xs font-medium text-fg-secondary truncate no-underline hover:text-brand"
				[routerLink]="['/games', entry().game.code]"
			>{{ entry().game.title }}</a>
			<div class="flex items-center justify-between gap-1">
				<span class="text-[0.625rem] text-fg-muted truncate">
					{{ entry().platformAbbreviation ?? '' }}
				</span>
				@if (showActions()) {
					<div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
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
export class WishlistGridCard {
	entry = input.required<WishlistGridEntry>();
	position = input.required<number>();
	showActions = input<boolean>(false);
	isFirst = input<boolean>(false);
	isLast = input<boolean>(false);

	moveUp = output<void>();
	moveDown = output<void>();
	remove = output<void>();
}
