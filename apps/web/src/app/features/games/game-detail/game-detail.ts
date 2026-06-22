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
import { ReviewsService, Review } from "../reviews";
import { ListsService } from "../../lists/lists";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";
import { metascoreColorClass } from "../../../shared/utils/metascore-color";
import { FormsModule } from "@angular/forms";
import { UiButton, UiInput, UiTabs, UiTabList, UiTab, UiTabPanel } from "../../../shared/ui";

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

interface ReviewFormState {
	show: boolean;
	content: string;
	rating: number | null;
	submitting: boolean;
}

interface AddToListModalState {
	show: boolean;
	saving: boolean;
	selection: Map<string, boolean>;
	newListName: string;
	creatingNew: boolean;
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
		UiInput,
		UiTabs,
		UiTabList,
		UiTab,
		UiTabPanel
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
	private readonly reviewsService = inject(ReviewsService);
	private readonly listsService = inject(ListsService);

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
	protected readonly reviewForm = signal<ReviewFormState>({
		show: false,
		content: "",
		rating: null,
		submitting: false
	});

	protected readonly reviews = signal<Review[]>([]);
	protected readonly myReview = signal<Review | null>(null);
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
	protected readonly friendsActivity = signal<
		{
			username: string;
			name: string;
			avatarUrl: string | null;
			status: string;
			finishedAt: string | null;
			userRating: number | null;
		}[]
	>([]);
	protected readonly otherPlayers = signal<
		{
			username: string;
			name: string;
			avatarUrl: string | null;
			status: string;
		}[]
	>([]);
	protected readonly addToListModal = signal<AddToListModalState>({
		show: false,
		saving: false,
		selection: new Map(),
		newListName: "",
		creatingNew: false,
		error: ""
	});
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

	private autoOpenReviewIfRequested() {
		const shouldOpen =
			this.route.snapshot.queryParamMap.get("review") === "open";
		if (!shouldOpen) return;

		this.activeTab.set("reviews");

		if (this.myReview()) {
			this.openReviewForm();
			return;
		}

		const gameId = this.game()?.id;
		if (!gameId) {
			this.openReviewForm();
			return;
		}

		this.backlogService.getMyBacklog({ game_id: gameId }).subscribe({
			next: res => {
				const entry = res.data.backlog[0];
				if (entry) {
					this.updateReviewForm({
						show: true,
						rating: entry.userRating ?? null,
						content: entry.notes ?? ""
					});
				} else {
					this.openReviewForm();
				}
			},
			error: () => this.openReviewForm()
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
				this.loadReviews(game.id);
				this.gamesService.getGameLists(game.id).subscribe(data => {
					this.featuredLists.set(data.lists);
					this.myLists.set(data.myLists);
				});
				this.friendsActivity.set([]);
				this.otherPlayers.set([]);
				if (this.authService.isLoggedIn()) {
					this.gamesService
						.getFriendsActivity(game.id)
						.subscribe(friends => this.friendsActivity.set(friends));
					this.gamesService
						.getPlayers(game.id)
						.subscribe(players => this.otherPlayers.set(players));
				}
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

	protected friendStatusMeta(status: string): {
		label: string;
		classes: string;
		dot: string;
	} {
		switch (status) {
			case "completed":
				return {
					label: "Completed",
					classes: "bg-success/15 text-success",
					dot: "bg-success"
				};
			case "playing":
				return {
					label: "Playing",
					classes: "bg-brand/15 text-brand",
					dot: "bg-brand"
				};
			case "abandoned":
				return {
					label: "Abandoned",
					classes: "bg-warning/15 text-warning",
					dot: "bg-warning"
				};
			case "endless":
				return {
					label: "Endless",
					classes: "bg-brand-subtle text-brand",
					dot: "bg-brand"
				};
			default:
				return {
					label: "Backlog",
					classes: "bg-input-bg text-fg-muted",
					dot: "bg-fg-muted"
				};
		}
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
		const selection = new Map<string, boolean>();
		for (const list of this.myLists()) {
			selection.set(list.id, list.contains);
		}
		this.updateAddToListModal({
			show: true,
			selection,
			newListName: "",
			error: ""
		});
	}

	closeAddToListModal() {
		this.updateAddToListModal({ show: false });
	}

	setNewListName(value: string) {
		this.updateAddToListModal({ newListName: value });
	}

	createNewList() {
		const name = this.addToListModal().newListName.trim();
		if (!name || this.addToListModal().creatingNew) return;
		const gameId = this.game()?.id;
		if (!gameId) return;

		this.updateAddToListModal({ creatingNew: true, error: "" });
		this.listsService
			.create({
				name,
				isPublic: true,
				scoreSource: "metacritic",
				durationSource: "hltb"
			})
			.subscribe({
				next: list => {
					this.listsService.addItem(list.id, gameId).subscribe({
						next: () => {
							this.gamesService
								.getGameLists(gameId)
								.subscribe(data => {
									this.featuredLists.set(data.lists);
									this.myLists.set(data.myLists);
									const selection = new Map(
										this.addToListModal().selection
									);
									for (const l of data.myLists) {
										if (!selection.has(l.id))
											selection.set(l.id, l.contains);
									}
									this.updateAddToListModal({
										selection,
										newListName: "",
										creatingNew: false
									});
								});
						},
						error: () => {
							this.updateAddToListModal({
								error: "List created but failed to add game",
								creatingNew: false
							});
						}
					});
				},
				error: () => {
					this.updateAddToListModal({
						error: "Failed to create list",
						creatingNew: false
					});
				}
			});
	}

	toggleAddToListSelection(listId: string) {
		const next = new Map(this.addToListModal().selection);
		next.set(listId, !next.get(listId));
		this.updateAddToListModal({ selection: next });
	}

	isAddToListChecked(listId: string): boolean {
		return this.addToListModal().selection.get(listId) ?? false;
	}

	saveAddToList() {
		const gameId = this.game()?.id;
		if (!gameId) return;

		const selection = this.addToListModal().selection;
		const ops: Promise<unknown>[] = this.myLists().flatMap(list => {
			const newState = selection.get(list.id) ?? false;
			if (newState === list.contains) return [];
			const action = newState
				? this.listsService.addItem(list.id, gameId)
				: this.listsService.removeItem(list.id, gameId);
			return [
				new Promise((resolve, reject) =>
					action.subscribe({ next: resolve, error: reject })
				)
			];
		});

		if (ops.length === 0) {
			this.closeAddToListModal();
			return;
		}

		this.updateAddToListModal({ saving: true });
		Promise.all(ops)
			.then(() => {
				this.gamesService.getGameLists(gameId).subscribe(data => {
					this.featuredLists.set(data.lists);
					this.myLists.set(data.myLists);
					this.updateAddToListModal({ saving: false });
					this.closeAddToListModal();
				});
			})
			.catch(() => {
				this.updateAddToListModal({ saving: false });
			});
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

	openReviewForm() {
		const existing = this.myReview();
		this.updateReviewForm({
			show: true,
			content: existing?.content ?? "",
			rating: existing?.rating ?? null
		});
	}

	closeReviewForm() {
		this.updateReviewForm({ show: false });
	}

	setReviewContent(value: string) {
		this.updateReviewForm({ content: value });
	}

	setReviewRating(value: number | null) {
		this.updateReviewForm({ rating: value });
	}

	submitReview() {
		const gameId = this.game()?.id;
		if (!gameId) return;

		const state = this.reviewForm();
		const content = state.content.trim() || undefined;
		const rating = state.rating ?? undefined;
		if (!content && !rating) return;

		this.updateReviewForm({ submitting: true });
		const existing = this.myReview();
		const action = existing
			? this.reviewsService.updateReview(gameId, { content, rating })
			: this.reviewsService.createReview(gameId, { content, rating });

		action.subscribe({
			next: () => {
				this.updateReviewForm({ submitting: false, show: false });
				this.loadReviews(gameId);
			},
			error: () => this.updateReviewForm({ submitting: false })
		});
	}

	deleteReview() {
		const gameId = this.game()?.id;
		if (!gameId) return;
		this.reviewsService.deleteReview(gameId).subscribe(() => {
			this.myReview.set(null);
			this.loadReviews(gameId);
		});
	}

	private loadReviews(gameId: string) {
		this.reviewsService.getReviews(gameId).subscribe(reviews => {
			this.reviews.set(reviews);
			const userId = this.authService.user()?.id;
			if (userId) {
				this.myReview.set(
					reviews.find(r => r.user?.id === userId) ?? null
				);
			}
			this.autoOpenReviewIfRequested();
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

	protected updateReviewForm(patch: Partial<ReviewFormState>) {
		this.reviewForm.update(s => ({ ...s, ...patch }));
	}

	protected updateAddToListModal(patch: Partial<AddToListModalState>) {
		this.addToListModal.update(s => ({ ...s, ...patch }));
	}
}
