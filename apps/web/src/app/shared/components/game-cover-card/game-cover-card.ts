import { DatePipe, NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiIconButton } from "../../ui";
import { GamePoster } from "../game-poster/game-poster";
import { MoodTagsChips } from "../mood-tags-chips/mood-tags-chips";

type CoverActionId = "favorite" | "wishlist" | "backlog";

interface CoverAction {
	id: CoverActionId;
	label: string;
	icon: string;
	active: boolean;
	pressed: boolean | null;
	alwaysVisible: boolean;
	overlayActiveClass: string;
	barActiveClass: string;
}

export interface GameCoverCardGame {
	code: string;
	title: string;
	coverUrl?: string;
	backgroundUrl?: string;
}

@Component({
	selector: "app-game-cover-card",
	imports: [
		RouterLink,
		NgTemplateOutlet,
		DatePipe,
		UiIconButton,
		MoodTagsChips,
		GamePoster
	],
	template: `
		<div class="flex flex-col gap-1.5 text-inherit group">
			<div
				class="relative rounded-lg overflow-hidden bg-surface ring-1 ring-white/10 shadow-lg shadow-black/40 transition duration-200 group-hover:-translate-y-1 group-hover:ring-brand/60"
			>
				@if (clickable()) {
					<button
						type="button"
						class="block relative bg-transparent border-0 p-0 cursor-pointer w-full text-left"
						(click)="cardClick.emit()"
					>
						<ng-container *ngTemplateOutlet="cover" />
					</button>
				} @else {
					<a
						class="block relative"
						[routerLink]="['/games', game().code]"
					>
						<ng-container *ngTemplateOutlet="cover" />
					</a>
				}
				@if (showRemove()) {
					<button
						uiIconButton
						size="sm"
						tone="danger"
						class="!absolute !top-1 !right-1 !bg-black/60 hover:!bg-black/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100 pointer-coarse:opacity-100"
						aria-label="Remove"
						title="Remove"
						(click)="remove.emit()"
					>
						&times;
					</button>
				}
				@if (actions().length > 0) {
					<div
						class="absolute bottom-2 right-2 flex flex-col items-end gap-1.5 max-sm:hidden pointer-coarse:hidden"
					>
						@for (action of overlayActions(); track action.id) {
							<button
								type="button"
								class="flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm border-0 cursor-pointer transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-brand"
								[class]="
									action.active
										? action.overlayActiveClass
										: 'bg-black/60 text-white'
								"
								[class.opacity-0]="!action.alwaysVisible"
								[class.group-hover:opacity-100]="
									!action.alwaysVisible
								"
								[class.group-focus-within:opacity-100]="
									!action.alwaysVisible
								"
								[attr.aria-label]="action.label"
								[attr.aria-pressed]="action.pressed"
								[title]="action.label"
								(click)="trigger(action.id)"
							>
								<span
									aria-hidden="true"
									class="material-icons text-[1rem]"
									>{{ action.icon }}</span
								>
							</button>
						}
					</div>
					<div
						class="hidden max-sm:grid pointer-coarse:grid grid-flow-col auto-cols-fr border-t border-line"
					>
						@for (
							action of actions();
							track action.id;
							let first = $first
						) {
							<button
								type="button"
								class="min-h-[44px] inline-flex items-center justify-center bg-transparent border-0 border-line cursor-pointer transition hover:bg-surface-hover active:bg-line-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
								[class.border-l]="!first"
								[class]="
									action.active
										? action.barActiveClass
										: 'text-fg-muted hover:text-fg'
								"
								[attr.aria-label]="action.label"
								[attr.aria-pressed]="action.pressed"
								[title]="action.label"
								(click)="trigger(action.id)"
							>
								<span
									aria-hidden="true"
									class="material-icons text-lg"
									>{{ action.icon }}</span
								>
							</button>
						}
					</div>
				}
			</div>
			<a
				tabindex="-1"
				class="tap-area text-xs font-medium text-fg-secondary truncate no-underline hover:text-brand"
				[routerLink]="['/games', game().code]"
				>{{ game().title }}</a
			>
			@if (subtitle()) {
				<span class="text-[0.625rem] text-fg-muted truncate">{{
					subtitle()
				}}</span>
			}
			<app-mood-tags-chips [tags]="moodTags()" />
		</div>

		<ng-template #cover>
			<app-game-poster
				[src]="game().coverUrl ?? game().backgroundUrl"
				[title]="game().title"
				[width]="420"
				class="block w-full aspect-[2/3]"
			/>
			@if (topLeftBadge()) {
				<span
					class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold text-white bg-black/70 backdrop-blur-sm"
				>
					{{ topLeftBadge() }}
				</span>
			}
			@if (
				(ratio() !== null && ratio() !== undefined) ||
				(duration() !== null && duration() !== undefined)
			) {
				<div
					class="absolute top-2 right-2 flex flex-col items-end gap-1"
				>
					@if (ratio() !== null && ratio() !== undefined) {
						<span
							class="px-2 py-0.5 rounded-md text-xs font-display font-bold tabular-nums text-white bg-brand-solid/90 shadow-md shadow-black/40 backdrop-blur-sm"
							>{{ ratio() }}</span
						>
					}
					@if (duration() !== null && duration() !== undefined) {
						<span
							class="px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm"
							>{{ duration() }}h</span
						>
					}
				</div>
			}
			@if (acquiredAt()) {
				<span
					class="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm"
				>
					<span
						aria-hidden="true"
						class="material-icons text-[0.75rem]"
						>event</span
					>
					{{ acquiredAt() | date: "MMM d, y" }}
				</span>
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

	protected readonly actions = computed<CoverAction[]>(() => {
		const actions: CoverAction[] = [];
		if (this.showFavorite()) {
			const favorite = this.isFavorite();
			actions.push({
				id: "favorite",
				label: favorite ? "Remove from favorites" : "Add to favorites",
				icon: favorite ? "favorite" : "favorite_border",
				active: favorite,
				pressed: favorite,
				alwaysVisible: true,
				overlayActiveClass: "bg-black/60 text-nav-favorites",
				barActiveClass: "text-nav-favorites"
			});
		}
		if (this.showWishlistToggle()) {
			const wanted = this.inWishlist();
			actions.push({
				id: "wishlist",
				label: wanted
					? "Remove from Want to Get"
					: "Add to Want to Get",
				icon: "redeem",
				active: wanted,
				pressed: wanted,
				alwaysVisible: false,
				overlayActiveClass: "bg-nav-wishlist text-white",
				barActiveClass: "text-nav-wishlist"
			});
		}
		if (this.showAddToBacklog()) {
			const inBacklog = this.inBacklog();
			actions.push({
				id: "backlog",
				label: inBacklog ? "Edit in My Games" : "Add to My Games",
				icon: inBacklog ? "check" : "playlist_add",
				active: inBacklog,
				pressed: null,
				alwaysVisible: false,
				overlayActiveClass: "bg-success text-white",
				barActiveClass: "text-success"
			});
		}
		return actions;
	});

	protected readonly overlayActions = computed(() =>
		[...this.actions()].reverse()
	);

	protected trigger(id: CoverActionId) {
		if (id === "favorite") this.favoriteToggle.emit();
		else if (id === "wishlist") this.wishlistToggle.emit();
		else this.addToBacklog.emit();
	}
}
