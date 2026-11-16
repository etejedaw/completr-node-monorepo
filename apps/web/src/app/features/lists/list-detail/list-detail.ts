import {
	CdkDrag,
	type CdkDragDrop,
	CdkDropList,
	moveItemInArray
} from "@angular/cdk/drag-drop";
import { HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { filter, forkJoin, type Subscription, take } from "rxjs";

import { type Game, type List, type ListItem } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import { injectExportDownload } from "../../../shared/components/export-actions/export-download";
import { GiftOfferCard } from "../../../shared/components/gift-offer-card/gift-offer-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { type LibraryHeroBackLink } from "../../../shared/components/library-hero/library-hero.model";
import { profileBackLink } from "../../../shared/components/library-hero/library-hero-back-link";
import { ProgressMeter } from "../../../shared/components/progress-meter/progress-meter";
import {
	UiActionMenu,
	type UiActionMenuItem,
	UiButton,
	UiEmptyState,
	UiSkeleton
} from "../../../shared/ui";
import { gameArtUrl } from "../../../shared/utils/game-art";
import { injectToggleAction } from "../../../shared/utils/inject-toggle-action";
import { PendingRemovals } from "../../../shared/utils/pending-removals";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import {
	DuplicateListModal,
	type DuplicateListModalResult
} from "../duplicate-list-modal/duplicate-list-modal";
import { type DuplicateListModalData } from "../duplicate-list-modal/duplicate-list-modal.model";
import { ListAddGame } from "../list-add-game/list-add-game";
import {
	ListItemRow,
	type ListItemRowMode
} from "../list-item-row/list-item-row";
import { ListModal } from "../list-modal/list-modal";
import {
	type ListModalData,
	type ListModalResult
} from "../list-modal/list-modal.model";
import { ListsService } from "../lists";

const LIST_ACTIONS: UiActionMenuItem[] = [
	{ id: "edit", icon: "edit", label: "Edit list" },
	{ id: "refresh", icon: "refresh", label: "Refresh scores" },
	{ id: "duplicate", icon: "content_copy", label: "Duplicate" }
];

@Component({
	selector: "app-list-detail",
	imports: [
		UiActionMenu,
		GiftOfferCard,
		RouterLink,
		CdkDropList,
		CdkDrag,
		LibraryHero,
		ListAddGame,
		ListItemRow,
		ProgressMeter,
		UiButton,
		UiEmptyState,
		UiSkeleton
	],
	templateUrl: "./list-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly listsService = inject(ListsService);
	private readonly authService = inject(AuthService);
	private readonly dialogs = inject(DialogService);
	protected readonly openBacklogQuickAdd = injectBacklogQuickAdd(() =>
		this.loadList()
	);
	private readonly toast = inject(ToastService);
	private readonly listWrite = injectToggleAction();
	private readonly destroyRef = inject(DestroyRef);
	private readonly pendingRemovals = new PendingRemovals<ListItem>(
		item => item.game.id
	);

	protected readonly list = signal<List | null>(null);
	protected readonly isOwner = computed(
		() => this.list()?.userId === this.authService.user()?.id
	);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly refreshing = signal(false);
	protected readonly showAddSearch = signal(false);
	protected readonly togglingFollow = signal(false);
	protected readonly exporter = injectExportDownload({
		resource: () => ({ listId: this.listId }),
		label: () => this.list()?.name ?? "list"
	});
	protected readonly listMenuItems = computed<UiActionMenuItem[]>(() => [
		...LIST_ACTIONS.map(action =>
			action.id === "refresh"
				? { ...action, busy: this.refreshing() }
				: action
		),
		...this.exporter
			.menuItems()
			.map((item, index) => ({ ...item, separated: index === 0 }))
	]);
	protected readonly listMenuBusy = computed(
		() => this.refreshing() || this.exporter.isBusy()
	);
	protected readonly skeletonRange = [0, 1, 2, 3, 4];
	protected readonly heroPosters = computed(() =>
		(this.list()?.items ?? []).map(item => ({
			src: gameArtUrl(item.game, "portrait"),
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
	private loadSubscription: Subscription | null = null;
	private static readonly COMPARE_PARAM = "compare";

	protected readonly fromUsername = signal<string | null>(null);
	protected readonly backLink = computed<LibraryHeroBackLink>(() => {
		const username = this.fromUsername();
		return username
			? profileBackLink(username)
			: { label: "Lists", link: "/lists" };
	});
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
	}

	protected addGame(game: Game) {
		const current = this.serverOrder(this.visibleItems());
		if (current.includes(game.id)) return;
		this.listWrite.run({
			key: `add:${game.id}`,
			request: this.listsService.replaceItems(this.listId, [
				...current,
				game.id
			]),
			failureMessage: "Could not add the game.",
			onSuccess: () => this.loadList(),
			onMissing: () => this.markListMissing()
		});
	}

	protected readonly listedGameIds = computed(
		() => new Set((this.list()?.items ?? []).map(item => item.game.id))
	);

	protected removeItem(item: ListItem) {
		const current = this.list();
		if (!current) return;
		this.showItems(this.pendingRemovals.hide(item, current.items));
		this.toast.pending({
			message: `Removed ${item.game.title} from the list`,
			onCommit: () => {
				this.pendingRemovals.commit(item);
				this.listsService
					.replaceItems(
						this.listId,
						this.serverOrder(this.visibleItems())
					)
					.subscribe({
						next: () => this.loadList(),
						error: (error: unknown) => {
							this.reportWriteFailure(
								error,
								"Could not remove the game."
							);
							if (!this.isMissing(error)) this.loadList();
						}
					});
			},
			onUndo: () =>
				this.showItems(
					this.pendingRemovals.undo(item, this.visibleItems())
				)
		});
	}

	private visibleItems() {
		return this.list()?.items ?? [];
	}

	private showItems(items: ListItem[]) {
		const current = this.list();
		if (!current) return;
		this.list.set({
			...current,
			items: items.map((item, index) => ({
				...item,
				position: index + 1
			}))
		});
	}

	private showList(list: List) {
		this.list.set({
			...list,
			items: this.pendingRemovals.withoutPending(list.items)
		});
	}

	private serverOrder(visible: ListItem[]) {
		return this.pendingRemovals
			.withPending(visible)
			.map(item => item.game.id);
	}

	protected runListAction(id: string) {
		if (this.exporter.runMenuAction(id)) return;
		if (id === "refresh") this.refreshScores();
		else if (id === "duplicate") this.openDuplicate();
		else this.openEdit();
	}

	protected moveUp(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index === 0) return;
		[items[index - 1], items[index]] = [items[index], items[index - 1]];
		this.replaceWithOrder(items);
	}

	protected moveDown(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index >= items.length - 1) return;
		[items[index], items[index + 1]] = [items[index + 1], items[index]];
		this.replaceWithOrder(items);
	}

	protected onDrop(event: CdkDragDrop<ListItem[]>) {
		if (!this.isOwner()) return;
		if (event.previousIndex === event.currentIndex) return;
		const list = this.list();
		if (!list) return;
		const items = [...list.items];
		moveItemInArray(items, event.previousIndex, event.currentIndex);
		this.replaceWithOrder(items);
	}

	private openEdit() {
		const ref = this.dialogs.open<ListModalData, ListModalResult>(
			ListModal,
			{
				data: { list: this.list() }
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result?.status === "saved") this.loadList();
			else if (result?.status === "deleted")
				this.router.navigate(["/lists"]);
		});
	}

	protected openDuplicate() {
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

	private refreshScores() {
		this.refreshing.set(true);
		this.listsService.refreshScores(this.listId).subscribe({
			next: () => {
				this.refreshing.set(false);
				this.loadList();
			},
			error: (error: unknown) => {
				this.refreshing.set(false);
				this.reportWriteFailure(error, "Could not refresh the scores.");
			}
		});
	}

	protected toggleFollow() {
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
			error: (error: unknown) => {
				this.togglingFollow.set(false);
				this.reportWriteFailure(
					error,
					"Could not update your follow. Try again."
				);
			}
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
		this.loadSubscription?.unsubscribe();
		this.loadFailed.set(false);

		if (isComparing && this.canCompare()) {
			this.loadSubscription = forkJoin({
				fromList: this.listsService.getByIdForUser(from, this.listId),
				viewerList: this.listsService.getById(this.listId)
			}).subscribe({
				next: ({ fromList, viewerList }) => {
					this.showList(fromList);
					this.viewerProgress.set(
						this.buildProgressMap(viewerList.items)
					);
					this.viewerListProgress.set(viewerList.progress ?? null);
					this.isLoading.set(false);
				},
				error: (error: unknown) => this.handleLoadFailure(error)
			});
			return;
		}

		this.viewerProgress.set(new Map());
		this.viewerListProgress.set(null);
		const request$ = from
			? this.listsService.getByIdForUser(from, this.listId)
			: this.listsService.getById(this.listId);
		this.loadSubscription = request$.subscribe({
			next: list => {
				this.showList(list);
				this.isLoading.set(false);
			},
			error: (error: unknown) => this.handleLoadFailure(error)
		});
	}

	protected retryLoad() {
		this.isLoading.set(true);
		this.loadList();
	}

	private isMissing(error: unknown) {
		return error instanceof HttpErrorResponse && error.status === 404;
	}

	private markListMissing() {
		this.list.set(null);
		this.isLoading.set(false);
	}

	private handleLoadFailure(error: unknown) {
		this.isLoading.set(false);
		if (this.isMissing(error)) {
			this.list.set(null);
			return;
		}
		if (this.list()) {
			this.reportWriteFailure(error, "Could not refresh the list.");
			return;
		}
		this.loadFailed.set(true);
	}

	private reportWriteFailure(error: unknown, message: string) {
		if (this.isMissing(error)) {
			this.markListMissing();
			return;
		}
		if (
			error instanceof HttpErrorResponse &&
			isToastedByErrorInterceptor(error.status)
		)
			return;
		this.toast.error(message);
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
		const gameIds = this.serverOrder(items);
		this.listsService.replaceItems(this.listId, gameIds).subscribe({
			next: () => this.loadList(),
			error: (error: unknown) => {
				this.list.set(current);
				this.reportWriteFailure(error, "Could not reorder the list.");
			}
		});
	}
}
