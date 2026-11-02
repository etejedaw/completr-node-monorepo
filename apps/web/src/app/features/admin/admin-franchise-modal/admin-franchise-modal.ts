import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import {
	form,
	FormField,
	maxLength,
	required,
	validate
} from "@angular/forms/signals";
import { injectDialogRef } from "ng-primitives/dialog";
import { catchError, debounceTime, of, Subject, switchMap } from "rxjs";

import { type Game } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import {
	UiAlert,
	UiButton,
	UiDescription,
	UiDialog,
	UiFieldLabel,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel,
	UiSkeleton,
	UiTextarea
} from "../../../shared/ui";
import { FranchisesService } from "../../franchises/franchises";
import { type FranchiseDto } from "../../franchises/franchises.model";
import { GamesService } from "../../games/games";
import {
	type AdminFranchiseModalData,
	type SelectedGame
} from "./admin-franchise-modal.model";

export type AdminFranchiseModalResult = "saved";

@Component({
	selector: "app-admin-franchise-modal",
	imports: [
		FormField,
		GamePoster,
		UiAlert,
		UiButton,
		UiDescription,
		UiDialog,
		UiFieldLabel,
		UiIconButton,
		UiInput,
		UiTextarea,
		UiFormField,
		UiLabel,
		UiSkeleton
	],
	templateUrl: "./admin-franchise-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFranchiseModal implements OnInit {
	private readonly franchisesService = inject(FranchisesService);
	private readonly gamesService = inject(GamesService);
	private readonly dialogRef = injectDialogRef<
		AdminFranchiseModalData,
		AdminFranchiseModalResult
	>();
	private readonly franchise = this.dialogRef.data.franchise;
	private readonly searchSubject = new Subject<string>();

	protected readonly skeletonRange = [0, 1, 2];
	protected readonly isEdit = signal(false);
	protected readonly isLoading = signal(false);
	protected readonly isLoadingGames = signal(false);
	protected readonly hasMoreGames = signal(false);
	protected readonly gamesLoadError = signal(false);
	protected readonly searchError = signal(false);
	private initialGameIds: string[] = [];
	protected readonly error = signal("");

	protected readonly games = signal<SelectedGame[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isSearching = signal(false);
	protected readonly gamesLocked = computed(
		() =>
			this.isLoadingGames() ||
			this.gamesLoadError() ||
			this.hasMoreGames()
	);
	private readonly gamesChanged = computed(() => {
		const current = this.games().map(g => g.id);
		const initial = new Set(this.initialGameIds);
		return (
			current.length !== initial.size ||
			current.some(id => !initial.has(id))
		);
	});
	protected readonly missingGames = computed(
		() =>
			this.games().length === 0 && (!this.isEdit() || this.gamesChanged())
	);
	protected readonly results = signal<SelectedGame[]>([]);

	protected readonly model = signal({ name: "", description: "" });
	private readonly errorSnapshot = signal<{
		name: string;
		description: string;
	} | null>(null);
	protected readonly visibleError = computed(() => {
		const snapshot = this.errorSnapshot();
		const current = this.model();
		return snapshot &&
			(snapshot.name !== current.name ||
				snapshot.description !== current.description)
			? ""
			: this.error();
	});

	readonly form = form(this.model, path => {
		required(path.name, { message: "Name is required" });
		validate(path.name, ({ value }) =>
			value().length > 0 && value().trim().length === 0
				? { kind: "blankName", message: "Name is required" }
				: null
		);
		maxLength(path.name, 100, {
			message: "Name must be 100 characters or fewer"
		});
		maxLength(path.description, 500, {
			message: "Description must be 500 characters or fewer"
		});
	});

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(300),
				switchMap(query => {
					this.searchError.set(false);
					if (query.trim().length < 2) {
						this.isSearching.set(false);
						return of<Game[]>([]);
					}
					this.isSearching.set(true);
					return this.gamesService.searchLocal(query).pipe(
						catchError(() => {
							this.searchError.set(true);
							return of<Game[]>([]);
						})
					);
				})
			)
			.subscribe(games => {
				const selected = new Set(this.games().map(g => g.id));
				this.results.set(
					games
						.filter(g => !selected.has(g.id))
						.map(g => this.toSelected(g))
				);
				this.isSearching.set(false);
			});

		const f = this.franchise;
		if (f) {
			this.isEdit.set(true);
			this.model.set({ name: f.name, description: f.description ?? "" });
			this.loadGames(f.code);
		}
	}

	protected retryLoadGames() {
		if (this.franchise) this.loadGames(this.franchise.code);
	}

	private loadGames(code: string) {
		this.isLoadingGames.set(true);
		this.gamesLoadError.set(false);
		this.franchisesService
			.getFranchiseByCode(code, { limit: 100 })
			.subscribe({
				next: detail => {
					const games = detail.games.map(g => this.toSelected(g));
					this.games.set(games);
					this.initialGameIds = games.map(g => g.id);
					this.hasMoreGames.set(detail.hasMore);
					this.isLoadingGames.set(false);
				},
				error: () => {
					this.gamesLoadError.set(true);
					this.isLoadingGames.set(false);
				}
			});
	}

	private toSelected(g: Game): SelectedGame {
		return {
			id: g.id,
			title: g.title,
			backgroundUrl: g.backgroundUrl,
			releaseAt: g.releaseAt,
			franchiseName: g.franchise?.name ?? null
		};
	}

	onSearch(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.searchQuery.set(value);
		this.searchSubject.next(value);
	}

	addGame(game: SelectedGame) {
		if (this.gamesLocked()) return;
		this.games.update(games =>
			games.some(g => g.id === game.id) ? games : [...games, game]
		);
		this.results.update(results => results.filter(g => g.id !== game.id));
	}

	removeGame(id: string) {
		if (this.gamesLocked()) return;
		this.games.update(games => games.filter(g => g.id !== id));
	}

	onSubmit(event: Event) {
		event.preventDefault();
		if (
			this.form().invalid() ||
			this.missingGames() ||
			this.isLoading() ||
			this.isLoadingGames()
		)
			return;
		this.isLoading.set(true);
		this.error.set("");
		this.errorSnapshot.set(null);

		const val = this.form().value();
		const dto: FranchiseDto = {
			name: val.name.trim(),
			description: val.description.trim() || null,
			gameIds:
				this.isEdit() && !this.gamesChanged()
					? undefined
					: this.games().map(g => g.id)
		};

		if (this.isEdit()) this.saveEdit(dto);
		else this.saveCreate(dto);
	}

	private saveCreate(dto: FranchiseDto) {
		this.franchisesService.createFranchise(dto).subscribe({
			next: () => this.dialogRef.close("saved"),
			error: err => this.fail(err, "Creation failed")
		});
	}

	private saveEdit(dto: FranchiseDto) {
		this.franchisesService
			.updateFranchise(this.franchise!.id, dto)
			.subscribe({
				next: () => this.dialogRef.close("saved"),
				error: err => this.fail(err, "Update failed")
			});
	}

	private fail(
		err: { error?: { title?: string }; status?: number },
		fallback: string
	) {
		this.isLoading.set(false);
		this.errorSnapshot.set({ ...this.model() });
		this.error.set(
			err.status === 409
				? "A franchise with that name already exists"
				: (err.error?.title ?? fallback)
		);
	}

	onClose() {
		if (this.isLoading()) return;
		this.dialogRef.close();
	}
}
