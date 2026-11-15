import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { Router } from "@angular/router";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { type FollowingList, type List } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { GiftOfferCard } from "../../../shared/components/gift-offer-card/gift-offer-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { ListCard } from "../../../shared/components/list-card/list-card";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiAlert,
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiLoadError,
	UiPagination,
	UiPremiumBadge,
	UiSkeleton
} from "../../../shared/ui";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import { injectLibraryPosters } from "../../backlog/library-posters";
import { ListModal } from "../list-modal/list-modal";
import {
	type ListModalData,
	type ListModalResult
} from "../list-modal/list-modal.model";
import { ListsService } from "../lists";

@Component({
	selector: "app-list-overview",
	imports: [
		PageSearch,
		UiAlert,
		NgTemplateOutlet,
		GiftOfferCard,
		LibraryHero,
		LibraryToolbar,
		ListCard,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiLoadError,
		UiPagination,
		UiSkeleton,
		PremiumOnly,
		UiPremiumBadge
	],
	templateUrl: "./list-overview.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListOverview implements OnInit {
	private readonly listsService = inject(ListsService);
	private readonly dialogs = inject(DialogService);
	private readonly router = inject(Router);
	protected readonly listsLoader = injectLatestLoader();
	private readonly searchSubject = new Subject<string>();
	protected readonly isPremium = inject(AuthService).isPremium;

	protected readonly lists = signal<List[]>([]);
	protected readonly followingLists = signal<FollowingList[]>([]);
	protected readonly frozen = signal(false);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<List[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 25;
	protected readonly skeletonRange = [0, 1, 2];
	private readonly libraryPosters = injectLibraryPosters();
	protected readonly heroPosters = computed(() => {
		const fromLists = [...this.lists(), ...this.followingLists()]
			.flatMap(list => list.previewItems ?? [])
			.flatMap(item =>
				item.game
					? [{ src: item.game.backgroundUrl, title: item.game.title }]
					: []
			);
		return fromLists.length > 0 ? fromLists : this.libraryPosters();
	});

	protected readonly filterCount = computed(() => {
		if (this.searchQuery().length >= 2)
			return this.isSearching() ? null : this.searchResults().length;
		return this.isLoading() ? null : this.total();
	});

	protected onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadLists();
	}

	ngOnInit() {
		this.loadLists();
		this.loadFollowing();

		this.searchSubject
			.pipe(
				debounceTime(400),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					return this.listsService.search(query);
				})
			)
			.subscribe(lists => {
				this.searchResults.set(lists);
				this.isSearching.set(false);
			});
	}

	protected onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	protected onGiftClaimed() {
		this.loadLists();
	}

	protected openCreate() {
		this.openModal(null);
	}

	private openModal(list: List | null) {
		const ref = this.dialogs.open<ListModalData, ListModalResult>(
			ListModal,
			{
				data: { list }
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result?.status === "created")
				this.router.navigate(["/lists", result.list.id]);
			else if (result?.status === "saved") this.loadLists();
		});
	}

	protected loadLists() {
		this.isLoading.set(true);
		this.listsLoader.load(
			this.listsService.getMyLists({
				limit: this.limit,
				offset: this.offset()
			}),
			{
				next: res => {
					this.lists.set(res.data.lists);
					this.total.set(res.data.total ?? res.data.lists.length);
					this.frozen.set(res.data.frozen);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			}
		);
	}

	private loadFollowing() {
		this.listsService.getFollowing().subscribe({
			next: lists => this.followingLists.set(lists)
		});
	}
}
