import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { form, FormField, maxLength, required } from "@angular/forms/signals";
import { injectDialogRef } from "ng-primitives/dialog";
import { debounceTime, of, Subject, switchMap } from "rxjs";

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
import {
	type Franchise,
	type FranchiseDto,
	FranchisesService
} from "../../franchises/franchises";
import { GamesService } from "../../games/games";

export interface AdminFranchiseModalData {
	franchise: Franchise | null;
}
export type AdminFranchiseModalResult = "saved";

interface SelectedGame {
	id: string;
	title: string;
	backgroundUrl?: string;
	releaseAt?: string;
	franchiseName?: string | null;
}

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
	protected readonly error = signal("");

	protected readonly games = signal<SelectedGame[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isSearching = signal(false);
	protected readonly results = signal<SelectedGame[]>([]);

	protected readonly model = signal({ name: "", description: "" });

	readonly form = form(this.model, path => {
		required(path.name, { message: "Name is required" });
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
					if (query.trim().length < 2) {
						this.isSearching.set(false);
						return of<Game[]>([]);
					}
					this.isSearching.set(true);
					return this.gamesService.searchLocal(query);
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

	private loadGames(code: string) {
		this.isLoadingGames.set(true);
		this.franchisesService
			.getFranchiseByCode(code, { limit: 100 })
			.subscribe({
				next: detail => {
					const games = detail.games.map(g => this.toSelected(g));
					this.games.set(games);
					this.hasMoreGames.set(detail.hasMore);
					this.isLoadingGames.set(false);
				},
				error: () => this.isLoadingGames.set(false)
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
		this.games.update(games =>
			games.some(g => g.id === game.id) ? games : [...games, game]
		);
		this.results.update(results => results.filter(g => g.id !== game.id));
	}

	removeGame(id: string) {
		this.games.update(games => games.filter(g => g.id !== id));
	}

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid() || this.isLoading()) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form().value();
		const dto: FranchiseDto = {
			name: val.name.trim(),
			description: val.description.trim() || null,
			gameIds: this.games().map(g => g.id)
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
		this.error.set(
			err.status === 409
				? "A franchise with that name already exists"
				: (err.error?.title ?? fallback)
		);
	}

	onClose() {
		this.dialogRef.close();
	}
}
