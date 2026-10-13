import {
	CdkDrag,
	type CdkDragDrop,
	CdkDropList,
	moveItemInArray
} from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
	debounceTime,
	distinctUntilChanged,
	filter,
	forkJoin,
	of,
	Subject,
	switchMap,
	take
} from "rxjs";

import {
	type BacklogEntry,
	type Game,
	type List,
	type ListItem
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { ProgressMeter } from "../../../shared/components/progress-meter/progress-meter";
import {
	UiBottomSheet,
	UiButton,
	UiEmptyState,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { GamesService } from "../../games/games";
import {
	DuplicateListModal,
	type DuplicateListModalData,
	type DuplicateListModalResult
} from "../duplicate-list-modal/duplicate-list-modal";
import {
	ListItemRow,
	type ListItemRowMode
} from "../list-item-row/list-item-row";
import {
	ListModal,
	type ListModalData,
	type ListModalResult
} from "../list-modal/list-modal";
import { ListsService } from "../lists";

type ListActionId = "refresh" | "duplicate" | "edit";
type ItemActionId = "up" | "down" | "remove";

const LIST_ACTIONS: { id: ListActionId; icon: string; label: string }[] = [
	{ id: "edit", icon: "edit", label: "Edit list" },
	{ id: "refresh", icon: "refresh", label: "Refresh scores" },
	{ id: "duplicate", icon: "content_copy", label: "Duplicate" }
];

@Component({
	selector: "app-list-detail",
	imports: [
		RouterLink,
		CdkDropList,
		CdkDrag,
		GamePoster,
		LibraryHero,
		ListItemRow,
		ProgressMeter,
		UiBottomSheet,
		UiButton,
		UiEmptyState,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./list-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly listsService = inject(ListsService);
	private readonly gamesService = inject(GamesService);
	private readonly backlogService = inject(BacklogService);
	private readonly authService = inject(AuthService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);
	private readonly searchSubject = new Subject<string>();

	protected readonly list = signal<List | null>(null);
	protected readonly isOwner = computed(
		() => this.list()?.userId === this.authService.user()?.id
	);
	protected readonly isLoading = signal(true);
	protected readonly refreshing = signal(false);
	protected readonly showAddSearch = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly isSearchingOnline = signal(false);
	protected readonly togglingFollow = signal(false);
	protected readonly listSheetOpen = signal(false);
	protected readonly listActions = LIST_ACTIONS;
	protected readonly itemSheet = signal<{
		item: ListItem;
		index: number;
	} | null>(null);
	protected readonly skeletonRange = [0, 1, 2, 3, 4];
	protected readonly heroPosters = computed(() =>
		(this.list()?.items ?? []).map(item => ({
			src: item.game.backgroundUrl,
			title: item.game.title
		}))
	);
	protected readonly rowMode = computed<ListItemRowMode>(() => {
		if (this.compareMode() && this.canCompare()) return "compare";
		return this.fromUsername() && this.showComparisonBanner()
			? "theirs"
			: "own";
	});
	protected readonly progressSummary = computed(() => {
		const progress = this.list()?.progress;
		if (!progress || progress.total === 0) return null;
		return {
			...progress,
			complete: progress.completed >= progress.total
		};
	});

	private listId = "";
	private static readonly COMPARE_PARAM = "compare";

	protected readonly fromUsername = signal<string | null>(null);
	protected readonly compareMode = signal(false);
	protected readonly viewerProgress = signal<
		Map<
			string,
			{
				backlogStatus?: string;
				score?: number;
				realDuration?: number | null;
				personalRatio?: number | null;
			}
		>
	>(new Map());
	protected readonly viewerListProgress = signal<{
		completed: number;
		total: number;
	} | null>(null);
	protected readonly viewerUsername = computed(
		() => this.authService.user()?.username ?? null
	);
	protected readonly showComparisonBanner = computed(() => {
		const from = this.fromUsername();
		if (!from) return false;
		const viewer = this.viewerUsername();
		if (viewer && viewer === from) return false;
		return true;
	});
	protected readonly singleProgressLabel = computed(() =>
		this.showComparisonBanner()
			? `@${this.fromUsername()}’s progress`
			: "Your progress"
	);
	private readonly viewerLoaded$ = toObservable(this.authService.user).pipe(
		filter(user => user !== null),
		take(1)
	);
	protected readonly canCompare = computed(() => {
		if (!this.showComparisonBanner()) return false;
		return this.viewerUsername() !== null;
	});

	ngOnInit() {
		this.listId = this.route.snapshot.paramMap.get("id") ?? "";
		this.fromUsername.set(this.route.snapshot.queryParamMap.get("from"));
		this.compareMode.set(
			this.route.snapshot.queryParamMap.get(ListDetail.COMPARE_PARAM) ===
				"1"
		);
		if (this.listId) this.loadListOnceViewerIsKnown();

		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						this.isSearchingOnline.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					this.isSearchingOnline.set(false);
					return this.gamesService.searchLocal(query).pipe(
						switchMap(localResults => {
							if (localResults.length > 0) {
								return of(localResults);
							}
							this.isSearching.set(false);
							this.isSearchingOnline.set(true);
							return this.gamesService.search(query);
						})
					);
				})
			)
			.subscribe(games => {
				this.searchResults.set(games);
				this.isSearching.set(false);
				this.isSearchingOnline.set(false);
			});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	addGame(game: Game) {
		const current = this.list()?.items?.map(i => i.game.id) ?? [];
		if (current.includes(game.id)) return;
		this.listsService
			.replaceItems(this.listId, [...current, game.id])
			.subscribe(() => this.loadList());
	}

	isGameInList(gameId: string): boolean {
		return this.list()?.items?.some(i => i.game.id === gameId) ?? false;
	}

	removeItem(item: ListItem) {
		const current = this.list();
		if (!current) return;
		const remaining = current.items
			.filter(i => i.id !== item.id)
			.map((i, index) => ({ ...i, position: index + 1 }));
		this.list.set({ ...current, items: remaining });
		this.toast.pending({
			message: `Removed ${item.game.title} from the list`,
			onCommit: () =>
				this.listsService
					.replaceItems(
						this.listId,
						remaining.map(i => i.game.id)
					)
					.subscribe({
						next: () => this.loadList(),
						error: () => {
							this.list.set(current);
							this.toast.error("Could not remove the game.");
						}
					}),
			onUndo: () => this.list.set(current)
		});
	}

	runListAction(id: ListActionId) {
		this.listSheetOpen.set(false);
		if (id === "refresh") this.refreshScores();
		else if (id === "duplicate") this.openDuplicate();
		else this.openEdit();
	}

	runItemAction(id: ItemActionId) {
		const sheet = this.itemSheet();
		this.itemSheet.set(null);
		if (!sheet) return;
		if (id === "up") this.moveUp(sheet.index);
		else if (id === "down") this.moveDown(sheet.index);
		else this.removeItem(sheet.item);
	}

	moveUp(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index === 0) return;
		[items[index - 1], items[index]] = [items[index], items[index - 1]];
		this.replaceWithOrder(items);
	}

	moveDown(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index >= items.length - 1) return;
		[items[index], items[index + 1]] = [items[index + 1], items[index]];
		this.replaceWithOrder(items);
	}

	onDrop(event: CdkDragDrop<ListItem[]>) {
		if (!this.isOwner()) return;
		if (event.previousIndex === event.currentIndex) return;
		const list = this.list();
		if (!list) return;
		const items = [...list.items];
		moveItemInArray(items, event.previousIndex, event.currentIndex);
		this.replaceWithOrder(items);
	}

	openEdit() {
		const ref = this.dialogs.open<ListModalData, ListModalResult>(
			ListModal,
			{
				data: { list: this.list() }
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadList();
			else if (result === "deleted") this.router.navigate(["/lists"]);
		});
	}

	openDuplicate() {
		const l = this.list();
		if (!l) return;
		const ref = this.dialogs.open<
			DuplicateListModalData,
			DuplicateListModalResult
		>(DuplicateListModal, {
			data: { list: l }
		});
		ref.afterClosed.subscribe(newList => {
			if (newList) this.router.navigate(["/lists", newList.id]);
		});
	}

	openBacklogModal(item: ListItem) {
		this.gamesService.getByCode(item.game.code).subscribe(game => {
			this.openBacklog(null, game);
		});
	}

	openEditBacklog(item: ListItem) {
		this.backlogService.getMyBacklog({ game_id: item.game.id }).subscribe({
			next: res => {
				const entry = res.data.backlog[0];
				if (!entry) {
					this.openBacklogModal(item);
					return;
				}
				this.openBacklog(entry, null);
			},
			error: () => this.openBacklogModal(item)
		});
	}

	private openBacklog(
		entry: BacklogEntry | null,
		preselectedGame: Game | null
	) {
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame,
					preselectedCompilationParent: null,
					preselectAddToQueue: false
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadList();
		});
	}

	refreshScores() {
		this.refreshing.set(true);
		this.listsService.refreshScores(this.listId).subscribe({
			next: () => {
				this.refreshing.set(false);
				this.loadList();
			},
			error: () => this.refreshing.set(false)
		});
	}

	toggleFollow() {
		const l = this.list();
		if (!l || this.togglingFollow()) return;

		this.togglingFollow.set(true);
		const action = l.isFollowing
			? this.listsService.unfollow(this.listId)
			: this.listsService.follow(this.listId);

		action.subscribe({
			next: () => {
				this.togglingFollow.set(false);
				this.loadList();
			},
			error: () => this.togglingFollow.set(false)
		});
	}

	private loadListOnceViewerIsKnown() {
		const needsViewer = this.compareMode() && this.showComparisonBanner();
		if (!needsViewer || this.viewerUsername() !== null) {
			this.loadList();
			return;
		}
		this.viewerLoaded$.subscribe(() => this.loadList());
	}

	private loadList() {
		const from = this.fromUsername();
		const isComparing = from !== null && this.compareMode();

		if (isComparing && this.canCompare()) {
			forkJoin({
				fromList: this.listsService.getByIdForUser(from, this.listId),
				viewerList: this.listsService.getById(this.listId)
			}).subscribe({
				next: ({ fromList, viewerList }) => {
					this.list.set(fromList);
					this.viewerProgress.set(
						this.buildProgressMap(viewerList.items)
					);
					this.viewerListProgress.set(viewerList.progress ?? null);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
			return;
		}

		this.viewerProgress.set(new Map());
		this.viewerListProgress.set(null);
		const request$ = from
			? this.listsService.getByIdForUser(from, this.listId)
			: this.listsService.getById(this.listId);
		request$.subscribe({
			next: list => {
				this.list.set(list);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private buildProgressMap(items: ListItem[]) {
		const map = new Map<
			string,
			{
				backlogStatus?: string;
				score?: number;
				realDuration?: number | null;
				personalRatio?: number | null;
			}
		>();
		for (const item of items) {
			map.set(item.game.id, {
				backlogStatus: item.backlogStatus,
				score: item.score,
				realDuration: item.realDuration,
				personalRatio: item.personalRatio
			});
		}
		return map;
	}

	protected viewerStatusFor(gameId: string) {
		return this.viewerProgress().get(gameId);
	}

	protected goToOwnProgress() {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { from: null, [ListDetail.COMPARE_PARAM]: null },
			queryParamsHandling: "merge",
			replaceUrl: true
		});
		this.fromUsername.set(null);
		this.compareMode.set(false);
		this.viewerProgress.set(new Map());
		this.viewerListProgress.set(null);
		this.loadList();
	}

	protected enterCompareMode() {
		if (!this.canCompare()) return;
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { [ListDetail.COMPARE_PARAM]: "1" },
			queryParamsHandling: "merge",
			replaceUrl: true
		});
		this.compareMode.set(true);
		this.loadList();
	}

	protected exitCompareMode() {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { [ListDetail.COMPARE_PARAM]: null },
			queryParamsHandling: "merge",
			replaceUrl: true
		});
		this.compareMode.set(false);
		this.viewerProgress.set(new Map());
		this.viewerListProgress.set(null);
		this.loadList();
	}

	private replaceWithOrder(items: ListItem[]) {
		const current = this.list();
		if (!current) return;
		const optimistic = items.map((item, idx) => ({
			...item,
			position: idx + 1
		}));
		this.list.set({ ...current, items: optimistic });
		const gameIds = items.map(i => i.game.id);
		this.listsService.replaceItems(this.listId, gameIds).subscribe({
			next: () => this.loadList(),
			error: () => this.list.set(current)
		});
	}
}
