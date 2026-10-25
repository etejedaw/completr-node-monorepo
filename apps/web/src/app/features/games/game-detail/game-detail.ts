import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import {
	type BacklogEntry,
	type Game,
	type GamePlatinum
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { ExpandableText } from "../../../shared/components/expandable-text/expandable-text";
import { MoodTagsInput } from "../../../shared/components/mood-tags-input/mood-tags-input";
import { InView } from "../../../shared/directives/in-view";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiSkeleton,
	UiTextarea
} from "../../../shared/ui";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";
import { metascoreColorClass } from "../../../shared/utils/metascore-color";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { FavoritesService } from "../../favorites/favorites";
import { FranchisesService } from "../../franchises/franchises";
import { GameShelfService } from "../../game-shelf/game-shelf";
import {
	GameShelfModal,
	type GameShelfModalData,
	type GameShelfModalResult
} from "../../game-shelf/game-shelf-modal/game-shelf-modal";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import {
	PlatinumDialog,
	type PlatinumDialogData,
	type PlatinumDialogResult
} from "../../platinum/platinum-dialog/platinum-dialog";
import { QueueService } from "../../queue/queue";
import { WishlistService } from "../../wishlist/wishlist";
import {
	WishlistPlatformModal,
	type WishlistPlatformModalData,
	type WishlistPlatformModalResult
} from "../../wishlist/wishlist-platform-modal/wishlist-platform-modal";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import { GamesService } from "../games";
import {
	GameAddToListModal,
	type GameAddToListModalData,
	type ListsChanged
} from "./components/game-add-to-list-modal";
import {
	type AdminActionsState,
	GameAdminBar
} from "./components/game-admin-bar";
import { GameDlcList } from "./components/game-dlc-list";
import { GameFeaturedLists } from "./components/game-featured-lists";
import { type GameFact, GameHero } from "./components/game-hero";
import { GameLibraryActions } from "./components/game-library-actions";
import { GamePlatinumCard } from "./components/game-platinum-card";
import { GamePosterGrid } from "./components/game-poster-grid";
import {
	GameQueueRunPicker,
	type GameQueueRunPickerData,
	type GameQueueRunPickerResult
} from "./components/game-queue-run-picker";
import { GameReviews } from "./components/game-reviews";
import { GameRuns } from "./components/game-runs";
import { GameScoreCard } from "./components/game-score-card";
import { GameSection } from "./components/game-section";
import { GameSocialActivity } from "./components/game-social-activity";
import { type QueueIntent, resolveQueueIntent } from "./queue-intent";

const TIME_SOURCE_LABELS: Record<string, string> = {
	completr: "Completr",
	hltb: "HowLongToBeat",
	rawg: "RAWG"
};

const HERO_SCORE_SOURCES_LIMIT = 3;

interface ReportModalState {
	show: boolean;
	message: string;
	submitting: boolean;
	sent: boolean;
	error: string;
}

@Component({
	selector: "app-game-detail",
	imports: [
		RouterLink,
		AdminGameEditor,
		UiAlert,
		UiButton,
		UiFieldLabel,
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
		MoodTagsInput,
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
	private readonly franchisesService = inject(FranchisesService);
	private readonly authService = inject(AuthService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly queueService = inject(QueueService);
	private readonly wishlistService = inject(WishlistService);
	private readonly backlogService = inject(BacklogService);
	private readonly gameShelfService = inject(GameShelfService);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

	protected readonly game = signal<Game | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly franchiseTracked = signal(false);
	protected readonly togglingFranchise = signal(false);
	protected readonly moodTags = signal<string[]>([]);
	protected readonly moodTagsDraft = signal<string[]>([]);
	protected readonly moodTagsSuggestions = signal<string[]>([]);
	protected readonly editingMoodTags = signal(false);
	protected readonly savingMoodTags = signal(false);

	startEditMoodTags() {
		this.moodTagsDraft.set([...this.moodTags()]);
		this.editingMoodTags.set(true);
	}

	cancelEditMoodTags() {
		this.editingMoodTags.set(false);
	}

	updateMoodTagsDraft(tags: string[]) {
		this.moodTagsDraft.set(tags);
	}

	commitMoodTags() {
		const game = this.game();
		if (!game) return;
		this.savingMoodTags.set(true);
		this.moodTagsService
			.replaceGameTags(game.id, this.moodTagsDraft())
			.subscribe({
				next: tags => {
					this.moodTags.set(tags);
					this.editingMoodTags.set(false);
					this.savingMoodTags.set(false);
					this.moodTagsService
						.getMyTags()
						.subscribe(all =>
							this.moodTagsSuggestions.set(all.map(t => t.tag))
						);
				},
				error: () => this.savingMoodTags.set(false)
			});
	}
	protected readonly isLoading = signal(true);
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

	protected readonly adminActions = signal<AdminActionsState>({
		confirmDeactivate: false,
		confirmDelete: false,
		editor: false,
		deactivating: false,
		deleting: false
	});
	protected readonly reportModal = signal<ReportModalState>({
		show: false,
		message: "",
		submitting: false,
		sent: false,
		error: ""
	});
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
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.wishlistService.ensureIdsLoaded().subscribe();
		this.route.paramMap.subscribe(params => {
			const code = params.get("code");
			if (code) this.loadGame(code);
		});
	}

	private loadGame(code: string) {
		this.isLoading.set(true);
		this.game.set(null);
		this.similarGames.set([]);
		this.gamesService.getByCode(code).subscribe({
			next: game => {
				this.game.set(game);
				this.franchiseTracked.set(game.franchiseTracked ?? false);
				this.moodTags.set(game.userMoodTags ?? []);
				this.platinum.set(game.userPlatinum ?? null);
				this.editingMoodTags.set(false);
				this.isFavorite.set(this.favoritesService.isFavorite(game.id));
				this.isInWishlist.set(
					this.wishlistService.isInWishlist(game.id)
				);
				this.isLoading.set(false);
				this.loadSimilarGames(game);
				this.loadUserStatus(game.id);
				this.gamesService.getGameLists(game.id).subscribe(data => {
					this.featuredLists.set(data.lists);
					this.myLists.set(data.myLists);
				});
				this.moodTagsService
					.getMyTags()
					.subscribe(all =>
						this.moodTagsSuggestions.set(all.map(t => t.tag))
					);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private loadUserStatus(gameId: string) {
		this.backlogService.getMyBacklog({ game_id: gameId }).subscribe({
			next: res => this.myRuns.set(res.data.backlog)
		});
		this.loadQueuedRunIds(gameId);
		this.gameShelfService.getMyShelf({ limit: 100 }).subscribe({
			next: res =>
				this.isInShelf.set(
					res.data.gameShelf.some(s => s.game.id === gameId)
				)
		});
	}

	private loadQueuedRunIds(gameId: string) {
		this.queueService.getMyQueue().subscribe({
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
		this.gamesService
			.getGames({ limit: 30, genre: genre.code, sort_by: "random" })
			.subscribe(res => {
				const filtered = res.data.games.filter(g => g.id !== game.id);
				this.similarGames.set(filtered.slice(0, 8));
			});
	}

	toggleFavorite() {
		const gameId = this.game()?.id;
		if (!gameId || this.togglingFavorite()) return;
		this.togglingFavorite.set(true);
		this.favoritesService.toggle(gameId).subscribe({
			next: () => {
				this.isFavorite.set(this.favoritesService.isFavorite(gameId));
				this.togglingFavorite.set(false);
			},
			error: () => this.togglingFavorite.set(false)
		});
	}

	toggleFranchiseTrack() {
		const code = this.game()?.franchise?.code;
		if (!code || this.togglingFranchise()) return;
		const next = !this.franchiseTracked();
		this.togglingFranchise.set(true);
		const req$ = next
			? this.franchisesService.trackFranchise(code)
			: this.franchisesService.untrackFranchise(code);
		req$.subscribe({
			next: () => {
				this.franchiseTracked.set(next);
				this.togglingFranchise.set(false);
			},
			error: () => this.togglingFranchise.set(false)
		});
	}

	toggleWishlist() {
		const g = this.game();
		if (!g || this.togglingWishlist()) return;
		if (this.isInWishlist()) {
			this.togglingWishlist.set(true);
			this.wishlistService.remove(g.id).subscribe({
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
			ref.afterClosed.subscribe(result => {
				if (result === "saved")
					this.isInWishlist.set(
						this.wishlistService.isInWishlist(g.id)
					);
			});
		}
	}

	addToQueue() {
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
		ref.afterClosed.subscribe(result => {
			if (result === "newRun") this.openBacklog(true);
			else if (result) this.addRunToQueue(result);
		});
	}

	private addRunToQueue(run: BacklogEntry) {
		this.addingToQueue.set(true);
		this.queueService.addFromBacklog(run.id).subscribe({
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

	deactivateGame() {
		const g = this.game();
		if (!g || this.adminActions().deactivating) return;
		this.updateAdminActions({ deactivating: true });
		this.gamesService.deactivate(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: err => {
				this.updateAdminActions({
					deactivating: false,
					confirmDeactivate: false
				});
				this.reportAdminActionError(err, "Could not deactivate game.");
			}
		});
	}

	deleteGame() {
		const g = this.game();
		if (!g || this.adminActions().deleting) return;
		this.updateAdminActions({ deleting: true });
		this.gamesService.hardDelete(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: err => {
				this.updateAdminActions({
					deleting: false,
					confirmDelete: false
				});
				this.reportAdminActionError(err, "Could not delete game.");
			}
		});
	}

	private reportAdminActionError(err: { status?: number }, fallback: string) {
		const alreadyToastedByInterceptor = err.status === 409;
		if (alreadyToastedByInterceptor) return;
		this.toast.warning(adminErrorMessage(err) ?? fallback);
	}

	openBacklogModal() {
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
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadUserStatus(g.id);
		});
	}

	openRun(entry: BacklogEntry) {
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
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadUserStatus(g.id);
			else if (result === "newRun") this.openBacklogModal();
		});
	}

	openPlatinumDialog() {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<PlatinumDialogData, PlatinumDialogResult>(
			PlatinumDialog,
			{
				data: {
					gameId: g.id,
					gameTitle: g.title,
					platforms: g.platforms ?? [],
					runs: this.myRuns(),
					platinum: this.platinum()
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (!result) return;
			const platinum = result === "removed" ? null : result.platinum;
			this.platinum.set(platinum);
			this.myRuns.update(runs => runs.map(run => ({ ...run, platinum })));
			this.toast.success(
				platinum
					? `${g.title} platinumed`
					: `Platinum removed from ${g.title}`
			);
		});
	}

	openShelfModal() {
		const g = this.game();
		if (!g) return;
		const ref = this.dialogs.open<GameShelfModalData, GameShelfModalResult>(
			GameShelfModal,
			{ data: { entry: null, preselectedGame: g } }
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadUserStatus(g.id);
		});
	}

	onEditorSaved() {
		this.updateAdminActions({ editor: false });
		const code = this.game()?.code;
		if (code) this.loadGame(code);
	}

	onEditorSplit(firstVariant: { code: string }) {
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

	openAddToListModal() {
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

	onAddToListListsChanged(data: ListsChanged) {
		this.featuredLists.set(data.lists);
		this.myLists.set(data.myLists);
	}

	openReportModal() {
		this.updateReportModal({ show: true, message: "", error: "" });
	}

	closeReportModal() {
		this.updateReportModal({ show: false });
	}

	setReportMessage(value: string) {
		this.updateReportModal({ message: value });
	}

	reportMissingData() {
		const gameId = this.game()?.id;
		if (!gameId || this.reportModal().submitting) return;
		this.updateReportModal({ submitting: true });
		this.gamesService
			.reportGame(
				gameId,
				"Missing data for Completr Score (auto-reported from aggregate slot)",
				"missing_score"
			)
			.subscribe({
				next: () =>
					this.updateReportModal({ submitting: false, sent: true }),
				error: err =>
					this.updateReportModal({
						submitting: false,
						sent:
							err.status === 409 ? true : this.reportModal().sent
					})
			});
	}

	submitReport() {
		const gameId = this.game()?.id;
		const state = this.reportModal();
		if (
			!gameId ||
			!state.message ||
			state.message.length < 10 ||
			state.submitting
		)
			return;

		this.updateReportModal({ submitting: true, error: "" });
		this.gamesService.reportGame(gameId, state.message).subscribe({
			next: () =>
				this.updateReportModal({
					submitting: false,
					show: false,
					sent: true
				}),
			error: err =>
				this.updateReportModal({
					submitting: false,
					error:
						err.error?.detail ||
						err.error?.title ||
						"Failed to submit report"
				})
		});
	}

	protected updateAdminActions(patch: Partial<AdminActionsState>) {
		this.adminActions.update(s => ({ ...s, ...patch }));
	}

	protected updateReportModal(patch: Partial<ReportModalState>) {
		this.reportModal.update(s => ({ ...s, ...patch }));
	}
}
