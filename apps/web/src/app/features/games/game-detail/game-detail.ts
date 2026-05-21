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
import { GamesService } from "../games.service";
import { ScoreSourcesService } from "../../../core/services/score-sources.service";
import { AuthService } from "../../../core/services/auth.service";
import { FavoritesService } from "../../favorites/favorites.service";
import { WishlistService } from "../../wishlist/wishlist.service";
import { BacklogService } from "../../backlog/backlog.service";
import { GameShelfService } from "../../game-shelf/game-shelf.service";
import { BacklogModal } from "../../backlog/backlog-modal/backlog-modal";
import { GameShelfModal } from "../../game-shelf/game-shelf-modal/game-shelf-modal";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { getRatingLabel } from "../../../shared/constants/rating-labels";
import { AdminGameEditor } from "../admin-game-editor/admin-game-editor";
import { ReviewsService, Review } from "../reviews.service";
import { ListsService } from "../../lists/lists.service";
import { pickCanonicalScore } from "../../../shared/utils/canonical-score";
import { FormsModule } from "@angular/forms";
import { UiButton, UiInput, UiTabs, UiTabList, UiTab, UiTabPanel } from "../../../shared/ui";

@Component({
	selector: "app-game-detail",
	imports: [
		RouterLink,
		StarRating,
		BacklogModal,
		GameShelfModal,
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
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly backlogService = inject(BacklogService);
	private readonly gameShelfService = inject(GameShelfService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly listsService = inject(ListsService);

	protected readonly game = signal<Game | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly similarGames = signal<Game[]>([]);
	protected readonly isFavorite = signal(false);
	protected readonly isInBacklog = signal(false);
	protected readonly isInWishlist = signal(false);
	protected readonly isInShelf = signal(false);
	protected readonly addedToWishlist = signal(false);
	protected readonly showBacklogModal = signal(false);
	protected readonly backlogModalPreselectWishlist = signal(false);
	protected readonly showShelfModal = signal(false);
	protected readonly isModerator = computed(() => {
		const role = this.authService.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly isAdmin = computed(
		() => this.authService.user()?.role === "admin"
	);
	protected readonly showConfirmDeactivate = signal(false);
	protected readonly showConfirmDelete = signal(false);
	protected readonly showEditor = signal(false);
	protected readonly deactivating = signal(false);
	protected readonly deleting = signal(false);
	protected readonly togglingFavorite = signal(false);
	protected readonly showReportModal = signal(false);
	protected readonly reportMessage = signal("");
	protected readonly reportSubmitting = signal(false);
	protected readonly reportSent = signal(false);

	// Reviews
	protected readonly reviews = signal<Review[]>([]);
	protected readonly myReview = signal<Review | null>(null);
	protected readonly showReviewForm = signal(false);
	protected readonly reviewContent = signal("");
	protected readonly reviewRating = signal<number | null>(null);
	protected readonly reviewSubmitting = signal(false);
	protected readonly reportError = signal("");
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
	protected readonly addToListSaving = signal(false);
	protected readonly addToListSelection = signal<Map<string, boolean>>(
		new Map()
	);
	protected readonly newListName = signal("");
	protected readonly creatingNewList = signal(false);
	protected readonly newListError = signal("");
	protected readonly myListsInGame = computed(() =>
		this.myLists().filter(l => l.contains)
	);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.favoritesService.load().subscribe();
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
					this.reviewRating.set(entry.userRating ?? null);
					this.reviewContent.set(entry.notes ?? "");
					this.showReviewForm.set(true);
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
				this.isLoading.set(false);
				this.loadSimilarGames(game);
				this.loadUserStatus(game.id);
				this.loadReviews(game.id);
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
		this.wishlistService.getMyWishlist().subscribe({
			next: wishlist => {
				const found = wishlist.some(w => w.backlog.game.id === gameId);
				this.isInWishlist.set(found);
				this.addedToWishlist.set(found);
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
			.getGames({ limit: 12, genre: genre.code })
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

	addToWishlist() {
		const g = this.game();
		if (!g || this.addedToWishlist()) return;
		this.backlogModalPreselectWishlist.set(true);
		this.showBacklogModal.set(true);
	}

	deactivateGame() {
		const g = this.game();
		if (!g || this.deactivating()) return;
		this.deactivating.set(true);
		this.gamesService.deactivate(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: () => this.deactivating.set(false)
		});
	}

	deleteGame() {
		const g = this.game();
		if (!g || this.deleting()) return;
		this.deleting.set(true);
		this.gamesService.hardDelete(g.id).subscribe({
			next: () => this.router.navigate(["/games"]),
			error: () => this.deleting.set(false)
		});
	}

	openBacklogModal() {
		this.backlogModalPreselectWishlist.set(false);
		this.showBacklogModal.set(true);
	}

	openShelfModal() {
		this.showShelfModal.set(true);
	}

	onModalClosed() {
		this.showBacklogModal.set(false);
		this.showShelfModal.set(false);
		this.backlogModalPreselectWishlist.set(false);
	}

	onModalSaved() {
		this.showBacklogModal.set(false);
		this.showShelfModal.set(false);
		this.backlogModalPreselectWishlist.set(false);
		const gameId = this.game()?.id;
		if (gameId) this.loadUserStatus(gameId);
	}

	onEditorSaved() {
		this.showEditor.set(false);
		const code = this.game()?.code;
		if (code) this.loadGame(code);
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
		const selection = new Map<string, boolean>();
		for (const list of this.myLists()) {
			selection.set(list.id, list.contains);
		}
		this.addToListSelection.set(selection);
		this.newListName.set("");
		this.newListError.set("");
		this.showAddToListModal.set(true);
	}

	closeAddToListModal() {
		this.showAddToListModal.set(false);
	}

	createNewList() {
		const name = this.newListName().trim();
		if (!name || this.creatingNewList()) return;
		const gameId = this.game()?.id;
		if (!gameId) return;

		this.creatingNewList.set(true);
		this.newListError.set("");
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
										this.addToListSelection()
									);
									for (const l of data.myLists) {
										if (!selection.has(l.id))
											selection.set(l.id, l.contains);
									}
									this.addToListSelection.set(selection);
									this.newListName.set("");
									this.creatingNewList.set(false);
								});
						},
						error: () => {
							this.newListError.set(
								"List created but failed to add game"
							);
							this.creatingNewList.set(false);
						}
					});
				},
				error: () => {
					this.newListError.set("Failed to create list");
					this.creatingNewList.set(false);
				}
			});
	}

	toggleAddToListSelection(listId: string) {
		const next = new Map(this.addToListSelection());
		next.set(listId, !next.get(listId));
		this.addToListSelection.set(next);
	}

	isAddToListChecked(listId: string): boolean {
		return this.addToListSelection().get(listId) ?? false;
	}

	saveAddToList() {
		const gameId = this.game()?.id;
		if (!gameId) return;

		const ops: Promise<unknown>[] = [];
		for (const list of this.myLists()) {
			const newState = this.addToListSelection().get(list.id) ?? false;
			if (newState === list.contains) continue;
			if (newState) {
				ops.push(
					new Promise((resolve, reject) =>
						this.listsService
							.addItem(list.id, gameId)
							.subscribe({ next: resolve, error: reject })
					)
				);
			} else {
				ops.push(
					new Promise((resolve, reject) =>
						this.listsService
							.removeItem(list.id, gameId)
							.subscribe({ next: resolve, error: reject })
					)
				);
			}
		}

		if (ops.length === 0) {
			this.closeAddToListModal();
			return;
		}

		this.addToListSaving.set(true);
		Promise.all(ops)
			.then(() => {
				this.gamesService.getGameLists(gameId).subscribe(data => {
					this.featuredLists.set(data.lists);
					this.myLists.set(data.myLists);
					this.addToListSaving.set(false);
					this.closeAddToListModal();
				});
			})
			.catch(() => {
				this.addToListSaving.set(false);
			});
	}

	openReportModal() {
		this.showReportModal.set(true);
		this.reportMessage.set("");
		this.reportError.set("");
	}

	reportMissingData() {
		const gameId = this.game()?.id;
		if (!gameId || this.reportSubmitting()) return;
		this.reportSubmitting.set(true);
		this.gamesService
			.reportGame(
				gameId,
				"Missing data for Completr Score (auto-reported from aggregate slot)",
				"missing_score"
			)
			.subscribe({
				next: () => {
					this.reportSubmitting.set(false);
					this.reportSent.set(true);
				},
				error: err => {
					this.reportSubmitting.set(false);
					if (err.status === 409) this.reportSent.set(true);
				}
			});
	}

	submitReport() {
		const gameId = this.game()?.id;
		const message = this.reportMessage();
		if (
			!gameId ||
			!message ||
			message.length < 10 ||
			this.reportSubmitting()
		)
			return;

		this.reportSubmitting.set(true);
		this.reportError.set("");
		this.gamesService.reportGame(gameId, message).subscribe({
			next: () => {
				this.reportSubmitting.set(false);
				this.showReportModal.set(false);
				this.reportSent.set(true);
			},
			error: err => {
				this.reportSubmitting.set(false);
				this.reportError.set(
					err.error?.detail ||
						err.error?.title ||
						"Failed to submit report"
				);
			}
		});
	}

	// Reviews
	openReviewForm() {
		const existing = this.myReview();
		if (existing) {
			this.reviewContent.set(existing.content ?? "");
			this.reviewRating.set(existing.rating ?? null);
		} else {
			this.reviewContent.set("");
			this.reviewRating.set(null);
		}
		this.showReviewForm.set(true);
	}

	submitReview() {
		const gameId = this.game()?.id;
		if (!gameId) return;

		const content = this.reviewContent().trim() || undefined;
		const rating = this.reviewRating() ?? undefined;
		if (!content && !rating) return;

		this.reviewSubmitting.set(true);
		const existing = this.myReview();
		const action = existing
			? this.reviewsService.updateReview(gameId, { content, rating })
			: this.reviewsService.createReview(gameId, { content, rating });

		action.subscribe({
			next: () => {
				this.reviewSubmitting.set(false);
				this.showReviewForm.set(false);
				this.loadReviews(gameId);
			},
			error: () => this.reviewSubmitting.set(false)
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
}
