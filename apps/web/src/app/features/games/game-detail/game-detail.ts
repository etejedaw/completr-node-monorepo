import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { type Observable, type Observer, Subscription } from "rxjs";

import {
	type BacklogEntry,
	type Game,
	type GamePlatinum
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { FavoritesService } from "../../../core/services/favorites";
import { GamesService } from "../../../core/services/games";
import { QueueService } from "../../../core/services/queue";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { ExpandableText } from "../../../shared/components/expandable-text/expandable-text";
import { InView } from "../../../shared/directives/in-view";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiDialog,
	UiEyebrow,
	UiFieldLabel,
	UiLoadError,
	UiPlainEmptyState,
	UiSkeleton,
	UiTextarea
} from "../../../shared/ui";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";
import { isNotFound } from "../../../shared/utils/http-failure";
import { metascoreColorClass } from "../../../shared/utils/metascore-color";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { type BacklogModalData } from "../../backlog/backlog-modal/backlog-modal.model";
import { injectFranchiseTracking } from "../../franchises/franchise-tracking";
import { GameShelfService } from "../../game-shelf/game-shelf";
import {
	GameShelfModal,
	type GameShelfModalResult
} from "../../game-shelf/game-shelf-modal/game-shelf-modal";
import { type GameShelfModalData } from "../../game-shelf/game-shelf-modal/game-shelf-modal.model";
import { PlatinumDialog } from "../../platinum/platinum-dialog/platinum-dialog";
import {
	type PlatinumDialogData,
	type PlatinumDialogResult
} from "../../platinum/platinum-dialog/platinum-dialog.model";
import { WishlistService } from "../../wishlist/wishlist";
import {
	WishlistPlatformModal,
	type WishlistPlatformModalResult
} from "../../wishlist/wishlist-platform-modal/wishlist-platform-modal";
import { type WishlistPlatformModalData } from "../../wishlist/wishlist-platform-modal/wishlist-platform-modal.model";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import { GameAddToListModal } from "./components/game-add-to-list-modal";
import {
	type GameAddToListModalData,
	type ListsChanged
} from "./components/game-add-to-list-modal.model";
import { GameAdminBar } from "./components/game-admin-bar";
import { GameDlcList } from "./components/game-dlc-list";
import { GameFeaturedLists } from "./components/game-featured-lists";
import { GameHero } from "./components/game-hero";
import { type GameFact } from "./components/game-hero.model";
import { GameLibraryActions } from "./components/game-library-actions";
import { GamePlatinumCard } from "./components/game-platinum-card";
import { GamePosterGrid } from "./components/game-poster-grid";
import {
	GameQueueRunPicker,
	type GameQueueRunPickerResult
} from "./components/game-queue-run-picker";
import { type GameQueueRunPickerData } from "./components/game-queue-run-picker.model";
import { GameReviews } from "./components/game-reviews";
import { GameRuns } from "./components/game-runs";
import { GameScoreCard } from "./components/game-score-card";
import { GameSection } from "./components/game-section";
import { GameSocialActivity } from "./components/game-social-activity";
import { GameTags } from "./components/game-tags";
import { injectGameAdminActions } from "./game-admin-actions";
import { type ExternalLinkView } from "./game-detail.model";
import { EXTERNAL_LINK_SOURCES } from "./game-external-links";
import { injectGameReport } from "./game-report";
import { resolveQueueIntent } from "./queue-intent";
import { type QueueIntent } from "./queue-intent.model";

const TIME_SOURCE_LABELS: Record<string, string> = {
	completr: "Completr",
	hltb: "HowLongToBeat",
	rawg: "RAWG"
};

const HERO_SCORE_SOURCES_LIMIT = 3;
const SIMILAR_GAMES_POOL = 30;
const SIMILAR_GAMES_SHOWN = 8;

@Component({
	selector: "app-game-detail",
	imports: [
		RouterLink,
		AdminGameEditor,
		UiAlert,
		UiBadge,
		UiButton,
		UiEyebrow,
		UiFieldLabel,
		UiLoadError,
		UiPlainEmptyState,
		UiTextarea,
		GameSection,
		InView,
		GameHero,
		GameLibraryActions,
		GameScoreCard,
		GameRuns,
		GamePlatinumCard,
		GamePosterGrid,
		GameFeaturedLists,
		GameDlcList,
		GameAdminBar,
		GameSocialActivity,
		GameReviews,
		GameTags,
		ExpandableText,
		UiDialog,
		UiSkeleton
	],
	templateUrl: "./game-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameDetail implements OnInit {
	protected readonly metascoreColorClass = metascoreColorClass;

	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly queueService = inject(QueueService);
	private readonly wishlistService = inject(WishlistService);
	private readonly backlogService = inject(BacklogService);
	private readonly gameShelfService = inject(GameShelfService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);
	private gameRequests = new Subscription();
	private statusRequests = new Subscription();

	protected readonly game = signal<Game | null>(null);
	protected readonly externalLinks = computed<ExternalLinkView[]>(() =>
		(this.game()?.externalLinks ?? []).flatMap(link => {
			const source = EXTERNAL_LINK_SOURCES[link.source];
			const href = source?.url(link.externalId);
			if (!source || !href) return [];
			return [{ source: link.source, label: source.label, href }];
		})
	);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	private readonly franchiseTracking = injectFranchiseTracking({
		onMissing: () => this.reloadGame()
	});
	private readonly trackableFranchise = computed(() => {
		const current = this.game();
		return current?.franchise
			? {
					code: current.franchise.code,
					name: current.franchise.name,
					isTracked: current.franchiseTracked ?? false
				}
			: undefined;
	});
	protected readonly franchiseTracked = computed(() => {
		const franchise = this.trackableFranchise();
		return franchise ? this.franchiseTracking.isTracked(franchise) : false;
	});
	protected readonly togglingFranchise = computed(() => {
		const franchise = this.trackableFranchise();
		return franchise ? this.franchiseTracking.isPending(franchise) : false;
	});
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	private requestedCode = "";
	protected readonly similarGames = signal<Game[]>([]);
	protected readonly isFavorite = signal(false);
	protected readonly isInWishlist = signal(false);
	protected readonly myRuns = signal<BacklogEntry[]>([]);
	protected readonly platinum = signal<GamePlatinum | null>(null);
	protected readonly platinumPlatformName = computed(() => {
		const platformId = this.platinum()?.platformId;
		if (!platformId) return null;
		const platform = this.game()?.platforms.find(p => p.id === platformId);
		if (platform) return platform.name;
		const run = this.myRuns().find(r => r.platform.id === platformId);
		return run?.platform.abbreviation ?? null;
	});
	protected readonly latestRun = computed(() => this.myRuns()[0] ?? null);
	protected readonly heroActionsInView = signal(true);
	protected readonly score = computed(() => pickCanonicalScore(this.game()));
	protected readonly externalScores = computed(() =>
		(this.game()?.scores ?? [])
			.filter(score => score.source !== "completr")
			.map(score => ({
				source: score.source,
				label: this.scoreSourceName(score.source),
				value: `${score.score}`,
				unit: this.scaleLabel(score.source),
				valueClass:
					score.source === "metacritic"
						? metascoreColorClass(score.score)
						: undefined
			}))
	);
	protected readonly externalTimes = computed(() =>
		(this.game()?.times ?? [])
			.filter(time => time.source !== "completr")
			.map(time => ({
				source: time.source,
				label: TIME_SOURCE_LABELS[time.source] ?? time.source,
				value: `${time.duration}`,
				unit: "h"
			}))
	);
	protected readonly heroFacts = computed<GameFact[]>(() => {
		const facts: GameFact[] = this.externalScores()
			.slice(0, HERO_SCORE_SOURCES_LIMIT)
			.map(({ label, value, unit, valueClass }) => ({
				label,
				value,
				unit,
				valueClass
			}));
		const duration =
			this.score().duration ?? this.game()?.times?.[0]?.duration;
		if (duration) {
			facts.push({
				label: "Time to beat",
				value: `${duration}`,
				unit: "h"
			});
		}
		return facts;
	});
	protected readonly compilationGames = computed(() =>
		(this.game()?.compilationItems ?? [])
			.map(item => item.game)
			.filter(game => game !== null)
	);
	protected readonly isInShelf = signal(false);
	protected readonly queuedRunIds = signal<ReadonlySet<string>>(new Set());
	protected readonly addedToQueue = computed(
		() => this.queuedRunIds().size > 0
	);
	protected readonly addingToQueue = signal(false);
	protected readonly isModerator = computed(() => {
		const role = this.authService.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly isAdmin = computed(
		() => this.authService.user()?.role === "admin"
	);
	protected readonly togglingFavorite = signal(false);
	protected readonly togglingWishlist = signal(false);

	private readonly adminFlow = injectGameAdminActions(this.game);
	private readonly reportFlow = injectGameReport(this.game);
	protected readonly adminActions = this.adminFlow.state;
	protected readonly updateAdminActions = this.adminFlow.update;
	protected readonly deactivateGame = this.adminFlow.deactivate;
	protected readonly deleteGame = this.adminFlow.remove;
	protected readonly reportModal = this.reportFlow.state;
	protected readonly openReportModal = this.reportFlow.open;
	protected readonly closeReportModal = this.reportFlow.close;
	protected readonly setReportMessage = this.reportFlow.setMessage;
	protected readonly reportMissingData = this.reportFlow.reportMissingData;
	protected readonly submitReport = this.reportFlow.submit;
	protected readonly featuredLists = signal<
		{
			id: string;
			name: string;
			description?: string;
			isOfficial: boolean;
			completed: boolean;
			owner: { username: string } | null;
		}[]
	>([]);
	protected readonly myLists = signal<
		{ id: string; name: string; isPublic: boolean; contains: boolean }[]
	>([]);
	protected readonly myListsInGame = computed(() =>
		this.myLists().filter(l => l.contains)
	);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.favoritesService
			.ensureIdsLoaded()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe();
		this.wishlistService
			.ensureIdsLoaded()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe();
		this.route.paramMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(params => {
				const code = params.get("code");
				if (code) this.loadGame(code);
			});
		this.destroyRef.onDestroy(() => {
			this.gameRequests.unsubscribe();
			this.statusRequests.unsubscribe();
		});
	}

	private watchGame<T>(
		source: Observable<T>,
		observer: Partial<Observer<T>> | ((value: T) => void)
	) {
		this.gameRequests.add(source.subscribe(observer));
	}

	private watchStatus<T>(
		source: Observable<T>,
		observer: Partial<Observer<T>> | ((value: T) => void)
	) {
		this.statusRequests.add(source.subscribe(observer));
	}

	private loadGame(code: string) {
		this.gameRequests.unsubscribe();
		this.statusRequests.unsubscribe();
		this.gameRequests = new Subscription();
		this.statusRequests = new Subscription();
		this.requestedCode = code;
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.game.set(null);
		this.similarGames.set([]);
		this.watchGame(this.gamesService.getByCode(code), {
			next: game => {
				this.game.set(game);
				this.platinum.set(game.userPlatinum ?? null);
				this.isFavorite.set(this.favoritesService.isFavorite(game.id));
				this.isInWishlist.set(
					this.wishlistService.isInWishlist(game.id)
				);
				this.isLoading.set(false);
				this.loadSimilarGames(game);
				this.loadUserStatus(game.id);
				this.watchGame(
					this.gamesService.getGameLists(game.id),
					data => {
						this.featuredLists.set(data.lists);
						this.myLists.set(data.myLists);
					}
				);
			},
			error: error => {
				this.loadFailed.set(!isNotFound(error));
				this.isLoading.set(false);
			}
		});
	}

	protected retryLoadGame() {
		if (this.isLoading()) return;
		this.loadGame(this.requestedCode);
	}

	private loadUserStatus(gameId: string) {
		this.statusRequests.unsubscribe();
		this.statusRequests = new Subscription();
		this.watchStatus(
			this.backlogService.getMyBacklog({ game_id: gameId }),
			{ next: res => this.myRuns.set(res.data.backlog) }
		);
		this.loadQueuedRunIds(gameId);
		this.watchStatus(
			this.gameShelfService.getMyShelf({ game_id: gameId, limit: 1 }),
			{ next: res => this.isInShelf.set(res.data.gameShelf.length > 0) }
		);
	}

	private loadQueuedRunIds(gameId: string) {
		this.watchStatus(this.queueService.getMyQueue(), {
			next: queue =>
				this.queuedRunIds.set(
					new Set(
						queue
							.filter(entry => entry.backlog.game.id === gameId)
							.map(entry => entry.backlog.id)
					)
				)
		});
	}

	private loadSimilarGames(game: Game) {
		const genre = game.genres?.[0];
		if (!genre) return;
		this.watchGame(
			this.gamesService.getGames({
				limit: SIMILAR_GAMES_POOL,
				genre: genre.code,
				sort_by: "random"
			}),
			res => {
				const filtered = res.data.games.filter(g => g.id !== game.id);
				this.similarGames.set(filtered.slice(0, SIMILAR_GAMES_SHOWN));
			}
		);
	}

	protected toggleFavorite() {
		const gameId = this.game()?.id;
		if (!gameId || this.togglingFavorite()) return;
		this.togglingFavorite.set(true);
		this.favoritesService
			.toggle(gameId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.isFavorite.set(
						this.favoritesService.isFavorite(gameId)
					);
					this.togglingFavorite.set(false);
				},
				error: () => this.togglingFavorite.set(false)
			});
	}

	protected toggleFranchiseTrack() {
		const franchise = this.trackableFranchise();
		if (franchise) this.franchiseTracking.toggle(franchise);
	}

	private reloadGame() {
		const code = this.game()?.code;
		if (code) this.loadGame(code);
	}

	protected toggleWishlist() {
		const g = this.game();
		if (!g || this.togglingWishlist()) return;
		if (this.isInWishlist()) {
			this.togglingWishlist.set(true);
			this.wishlistService
				.remove(g.id)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: () => {
						this.isInWishlist.set(false);
						this.togglingWishlist.set(false);
					},
					error: () => this.togglingWishlist.set(false)
				});
		} else {
			const ref = this.dialogs.open<
				WishlistPlatformModalData,
				WishlistPlatformModalResult
			>(WishlistPlatformModal, {
				data: {
					gameId: g.id,
					gameTitle: g.title,
					platforms: g.platforms
				}
			});
			ref.afterClosed
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(result => {
					if (result === "saved")
						this.isInWishlist.set(
							this.wishlistService.isInWishlist(g.id)
						);
				});
		}
	}

	protected addToQueue() {
		if (this.addedToQueue() || this.addingToQueue()) return;
		const intent = resolveQueueIntent(this.myRuns(), this.queuedRunIds());
		this.followQueueIntent(intent);
	}

	private followQueueIntent(intent: QueueIntent) {
		if (intent.kind === "direct") this.addRunToQueue(intent.run);
		else if (intent.kind === "pick") this.pickRunForQueue(intent);
		else this.openBacklog(true);
	}

	private pickRunForQueue(intent: Extract<QueueIntent, { kind: "pick" }>) {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<
			GameQueueRunPickerData,
			GameQueueRunPickerResult
		>(GameQueueRunPicker, {
			data: { gameTitle: g.title, runs: intent.runs }
		});
		ref.afterClosed
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(result => {
				if (result === "newRun") this.openBacklog(true);
				else if (result) this.addRunToQueue(result);
			});
	}

	private addRunToQueue(run: BacklogEntry) {
		this.addingToQueue.set(true);
		this.queueService
			.addFromBacklog(run.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.queuedRunIds.update(ids => new Set(ids).add(run.id));
					this.addingToQueue.set(false);
					this.toast.success(
						`Your ${run.platform.abbreviation} run is in Up Next.`
					);
				},
				error: () => {
					this.addingToQueue.set(false);
					this.loadQueuedRunIds(run.game.id);
				}
			});
	}

	protected openBacklogModal() {
		this.openBacklog(false);
	}

	private openBacklog(preselectAddToQueue: boolean) {
		const g = this.game();
		if (!g) return;
		const isCompilation =
			g.isCompilation && (g.compilationItems ?? []).length > 0;
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry: null,
					preselectedGame: isCompilation ? null : g,
					preselectedCompilationParent: isCompilation ? g : null,
					preselectAddToQueue
				}
			}
		);
		ref.afterClosed
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(result => {
				if (result === "saved") this.loadUserStatus(g.id);
			});
	}

	protected openRun(entry: BacklogEntry) {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame: null,
					preselectedCompilationParent: null,
					preselectAddToQueue: false,
					allowNewRun: true
				}
			}
		);
		ref.afterClosed
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(result => {
				if (result === "saved") this.loadUserStatus(g.id);
				else if (result === "newRun") this.openBacklogModal();
			});
	}

	protected openPlatinumDialog() {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<PlatinumDialogData, PlatinumDialogResult>(
			PlatinumDialog,
			{
				data: {
					context: {
						game: {
							id: g.id,
							code: g.code,
							title: g.title,
							coverUrl: g.coverUrl,
							backgroundUrl: g.backgroundUrl,
							platforms: g.platforms ?? []
						},
						runs: this.myRuns(),
						platinum: this.platinum()
					}
				}
			}
		);
		ref.afterClosed
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(result => {
				if (!result) return;
				const platinum = result === "removed" ? null : result.platinum;
				this.platinum.set(platinum);
				this.myRuns.update(runs =>
					runs.map(run => ({ ...run, platinum }))
				);
				this.toast.success(
					platinum
						? `${g.title} platinumed`
						: `Platinum removed from ${g.title}`
				);
			});
	}

	protected openShelfModal() {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<GameShelfModalData, GameShelfModalResult>(
			GameShelfModal,
			{ data: { entry: null, preselectedGame: g } }
		);
		ref.afterClosed
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(result => {
				if (result === "saved") this.loadUserStatus(g.id);
			});
	}

	protected onEditorSaved() {
		this.updateAdminActions({ editor: false });
		const code = this.game()?.code;
		if (code) this.loadGame(code);
	}

	protected onEditorSplit(firstVariant: { code: string }) {
		this.updateAdminActions({ editor: false });
		this.router.navigate(["/games", firstVariant.code]);
	}

	private scaleLabel(source: string): string | undefined {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/${scale}` : undefined;
	}

	private scoreSourceName(source: string): string {
		return (
			this.scoreSourcesService.sources().find(s => s.code === source)
				?.name ?? source
		);
	}

	protected openAddToListModal() {
		const g = this.game();
		if (!g) return;
		this.dialogs.open<GameAddToListModalData>(GameAddToListModal, {
			data: {
				gameId: g.id,
				gameTitle: g.title,
				myLists: this.myLists(),
				onListsChanged: data => this.onAddToListListsChanged(data)
			}
		});
	}

	protected onAddToListListsChanged(data: ListsChanged) {
		this.featuredLists.set(data.lists);
		this.myLists.set(data.myLists);
	}
}
