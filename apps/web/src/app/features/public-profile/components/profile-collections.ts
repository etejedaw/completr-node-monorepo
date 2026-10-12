import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { catchError, map, of } from "rxjs";

import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import { PublicLibraryService } from "../services/public-library.service";

type CollectionKind = "shelf" | "wishlist";

interface CollectionGame {
	id: string;
	game: { code: string; title: string; backgroundUrl?: string };
	badge?: string;
}

const COLLECTION_LIMIT = 12;

const COLLECTION_OPTIONS: {
	value: CollectionKind;
	label: string;
	route: string;
}[] = [
	{ value: "shelf", label: "Owned", route: "game-shelf" },
	{ value: "wishlist", label: "Wanted", route: "wishlist" }
];

@Component({
	selector: "app-profile-collections",
	imports: [GameCoverCard, PosterShelf],
	template: `
		@if (options().length > 0) {
			<app-poster-shelf
				[contained]="true"
				heading="Collection"
				eyebrow="Owned & wanted"
				seeAllLabel="See all"
				(seeAll)="openSelected()"
			>
				@if (options().length > 1) {
					<div
						shelfActions
						role="radiogroup"
						aria-label="Collection"
						class="inline-flex p-1 mr-1 bg-input-bg border border-line rounded-card"
					>
						@for (option of options(); track option.value) {
							<button
								type="button"
								role="radio"
								class="px-3 h-7 pointer-coarse:min-h-[44px] rounded-md border-0 bg-transparent text-xs font-medium text-fg-muted cursor-pointer transition hover:text-fg"
								[class.!bg-surface-hover]="
									selected() === option.value
								"
								[class.!text-fg]="selected() === option.value"
								[attr.aria-checked]="
									selected() === option.value
								"
								(click)="selected.set(option.value)"
							>
								{{ option.label }}
								<span class="ml-1 tabular-nums text-fg-muted">{{
									countFor(option.value)
								}}</span>
							</button>
						}
					</div>
				}
				@for (item of items(); track item.id) {
					<app-game-cover-card
						class="w-32 sm:w-40"
						[game]="item.game"
						[topLeftBadge]="item.badge"
					/>
				}
			</app-poster-shelf>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCollections {
	private readonly libraryService = inject(PublicLibraryService);
	private readonly router = inject(Router);

	readonly username = input.required<string>();
	readonly showShelf = input(false);
	readonly showWishlist = input(false);

	private readonly shelf = rxResource({
		params: () => (this.showShelf() ? this.username() : undefined),
		stream: ({ params: username }) =>
			this.libraryService
				.getUserGameShelf(username, { limit: COLLECTION_LIMIT })
				.pipe(
					map(page => ({
						total: page.total,
						items: page.items.map((entry): CollectionGame => ({
							id: entry.id,
							game: entry.game,
							badge: entry.platform.abbreviation
						}))
					})),
					catchError(() => of({ total: 0, items: [] }))
				)
	});

	private readonly wishlist = rxResource({
		params: () => (this.showWishlist() ? this.username() : undefined),
		stream: ({ params: username }) =>
			this.libraryService
				.getUserWishlist(username, { limit: COLLECTION_LIMIT })
				.pipe(
					map(page => ({
						total: page.total,
						items: page.items.map((entry): CollectionGame => ({
							id: entry.id,
							game: entry.game,
							badge: entry.platform?.abbreviation
						}))
					})),
					catchError(() => of({ total: 0, items: [] }))
				)
	});

	private readonly pages = computed(() => ({
		shelf: this.shelf.hasValue() ? this.shelf.value() : null,
		wishlist: this.wishlist.hasValue() ? this.wishlist.value() : null
	}));

	protected readonly options = computed(() =>
		COLLECTION_OPTIONS.filter(option => {
			const page = this.pages()[option.value];
			return !!page && page.total > 0;
		})
	);

	protected readonly selected = linkedSignal<CollectionKind>(
		() => this.options()[0]?.value ?? "shelf"
	);

	protected readonly items = computed(
		() => this.pages()[this.selected()]?.items ?? []
	);

	protected countFor(kind: CollectionKind): number {
		return this.pages()[kind]?.total ?? 0;
	}

	protected openSelected() {
		const route = COLLECTION_OPTIONS.find(
			option => option.value === this.selected()
		)!.route;
		this.router.navigate(["/user", this.username(), route]);
	}
}
