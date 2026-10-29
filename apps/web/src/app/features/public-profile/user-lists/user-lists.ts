import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	linkedSignal
} from "@angular/core";
import {
	rxResource,
	takeUntilDestroyed,
	toSignal
} from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, debounceTime, forkJoin, map, of, Subject } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	LibraryHero,
	type LibraryHeroPoster
} from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { ListCard } from "../../../shared/components/list-card/list-card";
import {
	UiButton,
	UiEmptyState,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import {
	type ProfileAccessError,
	ProfileAccessState
} from "../components/profile-access-state";
import {
	type PublicListsPage,
	type PublicListsQuery,
	PublicListsService
} from "../services/public-lists.service";
import {
	FOLLOWING_TAB_PARAM,
	parseProfileListsTab,
	type ProfileListsTab
} from "./user-lists-tab";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const HERO_POSTER_COUNT = 12;
const EMPTY_PAGE: PublicListsPage = { items: [], total: 0 };

const LIST_TABS: {
	tab: ProfileListsTab;
	label: string;
	queryParam: string | null;
}[] = [
	{ tab: "created", label: "Created", queryParam: null },
	{ tab: "following", label: "Following", queryParam: FOLLOWING_TAB_PARAM }
];

interface SearchChange {
	tab: ProfileListsTab;
	value: string;
}

@Component({
	selector: "app-user-lists",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		ListCard,
		ProfileAccessState,
		UiButton,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./user-lists.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserLists {
	private readonly route = inject(ActivatedRoute);
	private readonly listsService = inject(PublicListsService);
	private readonly authService = inject(AuthService);

	protected readonly tabs = LIST_TABS;
	protected readonly username =
		this.route.snapshot.paramMap.get("username") ?? "";
	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRange = [0, 1, 2, 3, 4, 5];

	protected readonly tab = toSignal(
		this.route.queryParamMap.pipe(
			map(params => parseProfileListsTab(params.get("tab")))
		),
		{
			initialValue: parseProfileListsTab(
				this.route.snapshot.queryParamMap.get("tab")
			)
		}
	);

	protected readonly query = linkedSignal({
		source: this.tab,
		computation: () => ""
	});
	protected readonly search = linkedSignal({
		source: this.tab,
		computation: () => ""
	});
	protected readonly offset = linkedSignal({
		source: this.tab,
		computation: () => 0
	});

	private readonly searchChanges = new Subject<SearchChange>();

	private readonly lists = rxResource({
		params: () => ({
			tab: this.tab(),
			search: this.search(),
			offset: this.offset()
		}),
		stream: ({ params: { tab, search, offset } }) =>
			this.fetchPage(tab, { limit: PAGE_SIZE, offset, search })
	});

	private readonly totals = rxResource({
		params: () => this.username,
		stream: ({ params: username }) => {
			const countOnly = { limit: 1 };
			return forkJoin({
				created: this.listsService
					.getUserLists(username, countOnly)
					.pipe(
						map(page => page.total),
						catchError(() => of(null))
					),
				following: this.listsService
					.getUserFollowingLists(username, countOnly)
					.pipe(
						map(page => page.total),
						catchError(() => of(null))
					)
			});
		}
	});

	private readonly page = computed(() =>
		this.lists.hasValue() ? this.lists.value() : null
	);

	private readonly lastLoadedPage = linkedSignal<
		PublicListsPage | null,
		PublicListsPage
	>({
		source: this.page,
		computation: (page, previous) => page ?? previous?.value ?? EMPTY_PAGE
	});

	private readonly inRangeOffset = computed(() => {
		const page = this.page();
		if (!page || page.items.length > 0 || this.offset() === 0) return null;
		return Math.max(0, Math.ceil(page.total / PAGE_SIZE) - 1) * PAGE_SIZE;
	});

	protected readonly isLoading = computed(
		() => this.lists.isLoading() || this.inRangeOffset() !== null
	);

	private readonly errorStatus = computed(() => {
		const error = this.lists.error() as { status?: number } | undefined;
		return error ? (error.status ?? 0) : null;
	});

	protected readonly accessError = computed<ProfileAccessError | null>(() => {
		const status = this.errorStatus();
		if (status === 403) return "private";
		if (status === 404) return "not_found";
		return null;
	});

	protected readonly hasLoadFailed = computed(
		() => this.errorStatus() !== null && this.accessError() === null
	);

	protected readonly isSelf = computed(
		() => this.authService.user()?.username === this.username
	);

	protected readonly visibleLists = computed(() => this.page()?.items ?? []);
	protected readonly total = computed(() => this.page()?.total ?? 0);

	protected readonly hasNoLists = computed(
		() =>
			!this.isLoading() &&
			!this.hasLoadFailed() &&
			!this.search() &&
			this.total() === 0
	);

	protected readonly heroPosters = computed<LibraryHeroPoster[]>(() =>
		this.lastLoadedPage()
			.items.flatMap(list => list.previewItems ?? [])
			.flatMap(item =>
				item.game?.backgroundUrl
					? [{ src: item.game.backgroundUrl, title: item.game.title }]
					: []
			)
			.slice(0, HERO_POSTER_COUNT)
	);

	protected readonly activeCount = computed(() => this.countFor(this.tab()));

	constructor() {
		this.searchChanges
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
			.subscribe(change => this.applySearch(change));

		effect(() => {
			const offset = this.inRangeOffset();
			if (offset !== null) this.offset.set(offset);
		});
	}

	protected onSearch(value: string) {
		this.query.set(value);
		this.searchChanges.next({ tab: this.tab(), value: value.trim() });
	}

	protected clearSearch() {
		this.query.set("");
		const change = { tab: this.tab(), value: "" };
		this.searchChanges.next(change);
		this.applySearch(change);
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
	}

	protected retry() {
		this.lists.reload();
	}

	protected countFor(tab: ProfileListsTab): number | null {
		const page = this.page();
		if (tab === this.tab() && page && !this.search()) return page.total;
		return this.totals.value()?.[tab] ?? null;
	}

	private applySearch(change: SearchChange) {
		if (change.tab !== this.tab()) return;
		this.search.set(change.value);
		this.offset.set(0);
	}

	private fetchPage(tab: ProfileListsTab, query: PublicListsQuery) {
		return tab === "following"
			? this.listsService.getUserFollowingLists(this.username, query)
			: this.listsService.getUserLists(this.username, query);
	}
}
