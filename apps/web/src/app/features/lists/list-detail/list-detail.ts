import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { List, ListItem, Game, BacklogEntry } from "../../../core/models";
import { ListsService } from "../lists.service";
import { AuthService } from "../../../core/services/auth.service";
import { ListModal } from "../list-modal/list-modal";
import { BacklogModal } from "../../backlog/backlog-modal/backlog-modal";
import { BacklogService } from "../../backlog/backlog.service";
import { GamesService } from "../../games/games.service";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of,
	forkJoin
} from "rxjs";
import { UiButton, UiIconButton, UiSearchBar } from "../../../shared/ui";
import { PersonalStats } from "../../../shared/components/personal-stats/personal-stats";

@Component({
	selector: "app-list-detail",
	imports: [
		RouterLink,
		ListModal,
		BacklogModal,
		UiButton,
		UiIconButton,
		UiSearchBar,
		PersonalStats
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
	private readonly searchSubject = new Subject<string>();

	protected readonly list = signal<List | null>(null);
	protected readonly isOwner = computed(
		() => this.list()?.userId === this.authService.user()?.id
	);
	protected readonly isLoading = signal(true);
	protected readonly refreshing = signal(false);
	protected readonly showAddSearch = signal(false);
	protected readonly showEditModal = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);
	protected readonly isSearchingOnline = signal(false);
	protected readonly showBacklogModal = signal(false);
	protected readonly backlogPreselectedGame = signal<Game | null>(null);
	protected readonly backlogEditingEntry = signal<BacklogEntry | null>(null);
	protected readonly togglingFollow = signal(false);

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
	protected readonly viewerListProgress = signal<
		{ completed: number; total: number } | null
	>(null);
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
		if (this.listId) this.loadList();

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
		const remaining =
			this.list()
				?.items?.filter(i => i.id !== item.id)
				.map(i => i.game.id) ?? [];
		this.listsService
			.replaceItems(this.listId, remaining)
			.subscribe(() => this.loadList());
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

	openEdit() {
		this.showEditModal.set(true);
	}

	onEditClosed() {
		this.showEditModal.set(false);
	}

	onEditSaved() {
		this.showEditModal.set(false);
		this.loadList();
	}

	onEditDeleted() {
		this.router.navigate(["/lists"]);
	}

	openBacklogModal(item: ListItem) {
		this.gamesService.getByCode(item.game.code).subscribe(game => {
			this.backlogPreselectedGame.set(game);
			this.showBacklogModal.set(true);
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
				this.backlogEditingEntry.set(entry);
				this.showBacklogModal.set(true);
			},
			error: () => this.openBacklogModal(item)
		});
	}

	onBacklogModalClosed() {
		this.showBacklogModal.set(false);
		this.backlogPreselectedGame.set(null);
		this.backlogEditingEntry.set(null);
	}

	onBacklogModalSaved() {
		this.showBacklogModal.set(false);
		this.backlogPreselectedGame.set(null);
		this.backlogEditingEntry.set(null);
		this.loadList();
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

	statusClass(status: string | undefined): string {
		if (!status) return "";
		const map: Record<string, string> = {
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned",
			endless: "status-endless"
		};
		return map[status] ?? "";
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
		const gameIds = items.map(i => i.game.id);
		this.listsService
			.replaceItems(this.listId, gameIds)
			.subscribe(() => this.loadList());
	}
}
