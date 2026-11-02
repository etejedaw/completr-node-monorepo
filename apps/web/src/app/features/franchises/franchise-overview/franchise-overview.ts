import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	signal
} from "@angular/core";
import { rxResource, toObservable, toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, map } from "rxjs";

import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	UiButton,
	UiEmptyState,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { FranchiseCard } from "../components/franchise-card/franchise-card";
import { injectFranchiseTracking } from "../franchise-tracking";
import { FranchisesService } from "../franchises";
import { type FranchisePage } from "../franchises.model";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_CARD_COUNT = 6;

@Component({
	selector: "app-franchise-overview",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		FranchiseCard,
		UiButton,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./franchise-overview.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FranchiseOverview {
	private readonly franchisesService = inject(FranchisesService);

	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRange = Array.from(
		{ length: SKELETON_CARD_COUNT },
		(_, index) => index
	);

	protected readonly searchQuery = signal("");
	private readonly appliedSearch = toSignal(
		toObservable(this.searchQuery).pipe(
			debounceTime(SEARCH_DEBOUNCE_MS),
			map(query => query.trim()),
			distinctUntilChanged()
		),
		{ initialValue: "" }
	);

	protected readonly offset = linkedSignal({
		source: this.appliedSearch,
		computation: () => 0
	});

	protected readonly page = rxResource({
		params: () => ({ search: this.appliedSearch(), offset: this.offset() }),
		stream: ({ params }) =>
			this.franchisesService.getFranchises({
				search: params.search || undefined,
				limit: PAGE_SIZE,
				offset: params.offset
			})
	});

	protected readonly tracking = injectFranchiseTracking({
		onMissing: () => this.page.reload()
	});

	private readonly loadedPage = computed(() =>
		this.page.hasValue() ? this.page.value() : undefined
	);

	protected readonly shownPage = linkedSignal<
		FranchisePage | undefined,
		FranchisePage | undefined
	>({
		source: this.loadedPage,
		computation: (value, previous) => value ?? previous?.value
	});

	protected readonly isFirstLoad = computed(
		() => !this.shownPage() && this.page.isLoading()
	);

	protected readonly isRefreshing = computed(
		() => !!this.shownPage() && this.page.isLoading()
	);

	protected readonly hasSearch = computed(
		() => this.appliedSearch().length > 0
	);

	protected readonly heroPosters = computed(() =>
		(this.shownPage()?.franchises ?? []).flatMap(franchise =>
			franchise.previewGames.map(game => ({
				src: game.backgroundUrl,
				title: game.title
			}))
		)
	);

	protected onSearch(query: string) {
		this.searchQuery.set(query);
	}

	protected clearSearch() {
		this.searchQuery.set("");
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
	}
}
