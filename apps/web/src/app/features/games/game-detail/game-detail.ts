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

@Component({
	selector: "app-game-detail",
	imports: [
		RouterLink,
		StarRating,
		BacklogModal,
		GameShelfModal,
		AdminGameEditor
	],
	templateUrl: "./game-detail.html",
	styleUrl: "./game-detail.css",
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

	protected readonly game = signal<Game | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly similarGames = signal<Game[]>([]);
	protected readonly isFavorite = signal(false);
	protected readonly isInBacklog = signal(false);
	protected readonly isInWishlist = signal(false);
	protected readonly isInShelf = signal(false);
	protected readonly addedToWishlist = signal(false);
	protected readonly addingToWishlist = signal(false);
	protected readonly showPlatformPicker = signal(false);
	protected readonly showBacklogModal = signal(false);
	protected readonly showShelfModal = signal(false);
	protected readonly isAdmin = computed(
		() => this.authService.user()?.role === "admin"
	);
	protected readonly showConfirmDeactivate = signal(false);
	protected readonly showConfirmDelete = signal(false);
	protected readonly showEditor = signal(false);
	protected readonly deactivating = signal(false);
	protected readonly deleting = signal(false);
	protected readonly togglingFavorite = signal(false);

	ngOnInit() {
		this.scoreSourcesService.load();
		this.favoritesService.load().subscribe();
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
				this.isLoading.set(false);
				this.loadSimilarGames(game);
				this.loadUserStatus(game.id);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private loadUserStatus(gameId: string) {
		this.backlogService.getMyBacklog().subscribe({
			next: res =>
				this.isInBacklog.set(
					res.data.backlog.some(b => b.game.id === gameId)
				)
		});
		this.wishlistService.getMyWishlist().subscribe({
			next: wishlist => {
				const found = wishlist.some(
					w => w.backlog.game.id === gameId
				);
				this.isInWishlist.set(found);
				this.addedToWishlist.set(found);
			}
		});
		this.gameShelfService.getMyShelf().subscribe({
			next: shelf =>
				this.isInShelf.set(
					shelf.some(s => s.game.id === gameId)
				)
		});
	}

	private loadSimilarGames(game: Game) {
		const genre = game.genres?.[0];
		if (!genre) return;
		this.gamesService
			.getGames({ limit: 10, genre: genre.code })
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
		if (!g || this.addingToWishlist() || this.addedToWishlist()) return;

		if (g.platforms.length > 1) {
			this.showPlatformPicker.set(true);
			return;
		}

		const platformId = g.platforms?.[0]?.id;
		if (!platformId) return;
		this.doAddToWishlist(g.id, platformId);
	}

	onWishlistPlatformSelected(event: Event) {
		const platformId = (event.target as HTMLSelectElement).value;
		if (!platformId) return;
		const g = this.game();
		if (!g) return;
		this.showPlatformPicker.set(false);
		this.doAddToWishlist(g.id, platformId);
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

	private doAddToWishlist(gameId: string, platformId: string) {
		this.addingToWishlist.set(true);
		this.wishlistService.addFromGame(gameId, platformId).subscribe({
			next: () => {
				this.addingToWishlist.set(false);
				this.addedToWishlist.set(true);
			},
			error: () => this.addingToWishlist.set(false)
		});
	}

	openBacklogModal() {
		this.showBacklogModal.set(true);
	}

	openShelfModal() {
		this.showShelfModal.set(true);
	}

	onModalClosed() {
		this.showBacklogModal.set(false);
		this.showShelfModal.set(false);
	}

	onModalSaved() {
		this.showBacklogModal.set(false);
		this.showShelfModal.set(false);
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

	protected get completrScore(): number | null {
		const score = this.game()?.scores?.find(s => s.source === "completr");
		return score?.score ?? null;
	}

	protected get completrLabel(): string {
		return getRatingLabel(this.completrScore);
	}

	protected get completrTime(): number | null {
		const time = this.game()?.times?.find(t => t.source === "completr");
		return time?.duration ?? null;
	}

	protected otherScores() {
		return this.game()?.scores?.filter(s => s.source !== "completr") ?? [];
	}

	protected otherTimes() {
		return this.game()?.times?.filter(t => t.source !== "completr") ?? [];
	}
}
