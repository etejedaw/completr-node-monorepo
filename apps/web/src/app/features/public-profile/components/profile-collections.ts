import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, map, of } from "rxjs";

import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import { PublicLibraryService } from "../services/public-library.service";
import { type CollectionGame } from "./profile-collections.model";

type CollectionKind = "shelf" | "wishlist";

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
	imports: [GameCoverCard, PosterShelf, SegmentedControl],
	template: `
		@if (options().length > 0) {
			<app-poster-shelf
				[contained]="true"
				heading="Collection"
				eyebrow="Owned & wanted"
				seeAllLabel="See all"
				[seeAllLink]="['/user', username(), selectedRoute()]"
			>
				@if (options().length > 1) {
					<app-segmented-control
						shelfActions
						class="mr-1"
						label="Collection"
						[options]="options()"
						[(value)]="selected"
					/>
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

	protected readonly options = computed<SegmentedOption<CollectionKind>[]>(
		() =>
			COLLECTION_OPTIONS.filter(
				option => (this.pages()[option.value]?.total ?? 0) > 0
			).map(option => ({
				value: option.value,
				label: option.label,
				count: this.pages()[option.value]!.total
			}))
	);

	protected readonly selected = linkedSignal<CollectionKind>(
		() => this.options()[0]?.value ?? "shelf"
	);

	protected readonly items = computed(
		() => this.pages()[this.selected()]?.items ?? []
	);

	protected readonly selectedRoute = computed(
		() =>
			COLLECTION_OPTIONS.find(option => option.value === this.selected())!
				.route
	);
}
