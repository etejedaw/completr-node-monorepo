import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	OnInit,
	output,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { GameShelfEntry } from "../../../core/models";
import { Game, Platform } from "../../../core/models";
import {
	GameShelfService,
	CreateGameShelfDto,
	UpdateGameShelfDto
} from "../game-shelf.service";
import { GamesService } from "../../games/games.service";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of
} from "rxjs";
import { UiButton, UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-game-shelf-modal",
	imports: [ReactiveFormsModule, UiButton, UiIconButton],
	templateUrl: "./game-shelf-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly shelfService = inject(GameShelfService);
	private readonly gamesService = inject(GamesService);

	entry = input<GameShelfEntry | null>(null);
	preselectedGame = input<Game | null>(null);
	closed = output<void>();
	saved = output<void>();

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly platforms = signal<Platform[]>([]);
	protected readonly gameResults = signal<Game[]>([]);
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly isSearching = signal(false);
	protected readonly gamePlatforms = computed(
		() => this.selectedGame()?.platforms ?? []
	);
	protected readonly showConfirmDelete = signal(false);
	protected readonly isForceSearching = signal(false);

	private readonly searchSubject = new Subject<string>();
	protected readonly isEdit = signal(false);

	form = this.fb.group({
		gameId: ["", Validators.required],
		platformId: ["", Validators.required],
		edition: [""],
		acquiredAt: [null as string | null],
		notes: [""]
	});

	ngOnInit() {
		this.gamesService.getPlatforms().subscribe(p => this.platforms.set(p));

		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					return this.gamesService.search(query);
				})
			)
			.subscribe(games => {
				this.gameResults.set(games);
				this.isSearching.set(false);
			});

		const e = this.entry();
		if (e) {
			this.isEdit.set(true);
			this.selectedGame.set({
				id: e.game.id,
				title: e.game.title,
				backgroundUrl: e.game.backgroundUrl
			} as Game);
			this.form.patchValue({
				gameId: e.game.id,
				platformId: e.platform.id,
				edition: e.edition ?? "",
				acquiredAt: e.acquiredAt ?? null,
				notes: e.notes ?? ""
			});
		}

		const pg = this.preselectedGame();
		if (pg && !this.isEdit()) {
			this.selectGame(pg);
		}
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	forceSearch() {
		const query = this.searchQuery();
		if (query.length < 2) return;
		this.isForceSearching.set(true);
		this.gamesService.search(query, true).subscribe({
			next: games => {
				this.gameResults.set(games);
				this.isForceSearching.set(false);
			},
			error: () => this.isForceSearching.set(false)
		});
	}

	selectGame(game: Game) {
		this.selectedGame.set(game);
		const platforms = game.platforms ?? [];
		this.form.patchValue({
			gameId: game.id,
			platformId: platforms.length === 1 ? platforms[0].id : ""
		});
		this.gameResults.set([]);
		this.searchQuery.set("");
	}

	clearGame() {
		this.selectedGame.set(null);
		this.form.patchValue({ gameId: "" });
	}

	onSubmit() {
		if (this.form.invalid) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form.getRawValue();

		if (this.isEdit()) {
			const dto: UpdateGameShelfDto = {
				edition: val.edition || null,
				acquiredAt: val.acquiredAt || null,
				notes: val.notes || null
			};
			this.shelfService.update(this.entry()!.id, dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateGameShelfDto = {
				gameId: val.gameId!,
				platformId: val.platformId!,
				edition: val.edition || undefined,
				acquiredAt: val.acquiredAt || undefined,
				notes: val.notes || undefined
			};
			this.shelfService.create(dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.shelfService.delete(this.entry()!.id).subscribe({
			next: () => this.saved.emit(),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.closed.emit();
	}
}
