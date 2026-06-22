import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Game } from "../../../core/models";
import { GamesService } from "../games";
import { ScoreSourcesService } from "../../../core/services/score-sources";
import { AuthService } from "../../../core/services/auth";
import { FavoritesService } from "../../favorites/favorites";
import { QueueService } from "../../queue/queue";
import { WishlistService } from "../../wishlist/wishlist";
import { WishlistPlatformModal } from "../../wishlist/wishlist-platform-modal/wishlist-platform-modal";
import { BacklogService } from "../../backlog/backlog";
import { GameShelfService } from "../../game-shelf/game-shelf";
import { BacklogModal } from "../../backlog/backlog-modal/backlog-modal";
import { GameShelfModal } from "../../game-shelf/game-shelf-modal/game-shelf-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { getRatingLabel } from "../../../shared/constants/rating-labels";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";
import { metascoreColorClass } from "../../../shared/utils/metascore-color";
import { FormsModule } from "@angular/forms";
import { UiButton, UiTabs, UiTabList, UiTab, UiTabPanel } from "../../../shared/ui";
import { GameSocialActivity } from "./components/game-social-activity";
import { GameAddToListModal, ListsChanged } from "./components/game-add-to-list-modal";
import { GameReviewsTab } from "./components/game-reviews-tab";

interface BacklogModalState {
	show: boolean;
	preselectQueue: boolean;
	game: Game | null;
	compilationParent: Game | null;
}

interface AdminActionsState {
	confirmDeactivate: boolean;
	confirmDelete: boolean;
	editor: boolean;
	deactivating: boolean;
	deleting: boolean;
}

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
		StarRating,
		BacklogModal,
		GameShelfModal,
		WishlistPlatformModal,
		AdminGameEditor,
		FormsModule,
		UiButton,
		UiTabs,
		UiTabList,
		UiTab,
		UiTabPanel,
		GameSocialActivity,
		GameAddToListModal,
		GameReviewsTab
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

	protected readonly game = signal<Game | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly similarGames = signal<Game[]>([]);
	protected readonly isFavorite = signal(false);
	protected readonly isInWishlist = signal(false);
	protected readonly isInBacklog = signal(false);
	protected readonly isInQueue = signal(false);
	protected readonly isInShelf = signal(false);
	protected readonly addedToQueue = signal(false);
	protected readonly showShelfModal = signal(false);
	protected readonly isModerator = computed(() => {
		const role = this.authService.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly isAdmin = computed(
		() => this.authService.user()?.role === "admin"
	);
	protected readonly togglingFavorite = signal(false);
	protected readonly togglingWishlist = signal(false);
	protected readonly showWishlistPlatformModal = signal(false);

	protected readonly backlogModal = signal<BacklogModalState>({
		show: false,
		preselectQueue: false,
		game: null,
		compilationParent: null
	});
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
	protected readonly activeTab = signal("overview");
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
	protected readonly showAddToListModal = signal(false);
	protected readonly myListsInGame = computed(() =>
		this.myLists().filter(l => l.contains)
	);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.favoritesService.load().subscribe();
		this.wishlistService.load().subscribe();
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
				this.isFavorite.set(this.favoritesService.isFavorite(game.id));
				this.isInWishlist.set(this.wishlistService.isInWishlist(game.id));
				this.isLoading.set(false);
				this.loadSimilarGames(game);
				this.loadUserStatus(game.id);
				this.gamesService.getGameLists(game.id).subscribe(data => {
					this.featuredLists.set(data.lists);
					this.myLists.set(data.myLists);
				});
			},
			error: () => this.isLoading.set(false)
		});
	}

	private loadUserStatus(gameId: string) {
		this.backlogService.getMyBacklog({ game_id: gameId }).subscribe({
			next: res => this.isInBacklog.set(res.data.backlog.length > 0)
		});
		this.queueService.getMyQueue().subscribe({
			next: queue => {
				const found = queue.some(w => w.backlog.game.id === gameId);
				this.isInQueue.set(found);
				this.addedToQueue.set(found);
			}
		});
		this.gameShelfService.getMyShelf({ limit: 100 }).subscribe({
			next: res =>
				this.isInShelf.set(
					res.data.gameShelf.some(s => s.game.id === gameId)
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
			this.showWishlistPlatformModal.set(true);
		}
	}

	onWishlistPlatformModalClosed() {
		this.showWishlistPlatformModal.set(false);
	}

	onWishlistPlatformModalSaved() {
		this.showWishlistPlatformModal.set(false);
		const gameId = this.game()?.id;
		if (gameId) this.isInWishlist.set(this.wishlistService.isInWishlist(gameId));
	}

	addToQueue() {
		const g = this.game();
		if (!g || this.addedToQueue()) return;
		const isCompilation = g.isCompilation && (g.compilationItems ?? []).length > 0;
		this.updateBacklogModal({
			show: true,
			preselectQueue: true,
			game: isCompilation ? null : g,
			compilationParent: isCompilation ? g : null
		});
	}

	deactivateGame() {
		const g = this.game();
		if (!g || this.adminActions().deactivating) return;
		this.updateAdminActions({ deactivating: true });
		this.gamesService.deactivate(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: () => this.updateAdminActions({ deactivating: false })
		});
	}

	deleteGame() {
		const g = this.game();
		if (!g || this.adminActions().deleting) return;
		this.updateAdminActions({ deleting: true });
		this.gamesService.hardDelete(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: () => this.updateAdminActions({ deleting: false })
		});
	}

	openBacklogModal() {
		const g = this.game();
		if (!g) return;
		const isCompilation = g.isCompilation && (g.compilationItems ?? []).length > 0;
		this.updateBacklogModal({
			show: true,
			preselectQueue: false,
			game: isCompilation ? null : g,
			compilationParent: isCompilation ? g : null
		});
	}

	openShelfModal() {
		this.showShelfModal.set(true);
	}

	onModalClosed() {
		this.showShelfModal.set(false);
		this.updateBacklogModal({
			show: false,
			preselectQueue: false,
			game: null,
			compilationParent: null
		});
	}

	onModalSaved() {
		this.showShelfModal.set(false);
		this.updateBacklogModal({
			show: false,
			preselectQueue: false,
			game: null,
			compilationParent: null
		});
		const gameId = this.game()?.id;
		if (gameId) this.loadUserStatus(gameId);
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

	protected getScaleLabel(source: string): string {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/ ${scale}` : "";
	}

	protected get canonicalScore() {
		return pickCanonicalScore(this.game());
	}

	protected get canonicalRatingLabel(): string {
		const cs = this.canonicalScore;
		if (cs.type !== "completr" || cs.score == null) return "";
		return getRatingLabel(cs.score);
	}

	protected otherScores() {
		return this.game()?.scores?.filter(s => s.source !== "completr") ?? [];
	}

	protected otherTimes() {
		return this.game()?.times?.filter(t => t.source !== "completr") ?? [];
	}

	openAddToListModal() {
		this.showAddToListModal.set(true);
	}

	closeAddToListModal() {
		this.showAddToListModal.set(false);
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
						sent: err.status === 409 ? true : this.reportModal().sent
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

	protected updateBacklogModal(patch: Partial<BacklogModalState>) {
		this.backlogModal.update(s => ({ ...s, ...patch }));
	}

	protected updateAdminActions(patch: Partial<AdminActionsState>) {
		this.adminActions.update(s => ({ ...s, ...patch }));
	}

	protected updateReportModal(patch: Partial<ReportModalState>) {
		this.reportModal.update(s => ({ ...s, ...patch }));
	}

}
