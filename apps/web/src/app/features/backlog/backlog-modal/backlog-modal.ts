import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	OnInit,
	output,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { BacklogEntry } from "../../../core/models";
import { Game, Platform } from "../../../core/models";
import {
	BacklogService,
	CreateBacklogDto,
	UpdateBacklogDto
} from "../backlog.service";
import { GamesService } from "../../games/games.service";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of
} from "rxjs";

@Component({
	selector: "app-backlog-modal",
	imports: [ReactiveFormsModule],
	templateUrl: "./backlog-modal.html",
	styleUrl: "./backlog-modal.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogModal implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);

	entry = input<BacklogEntry | null>(null);
	closed = output<void>();
	saved = output<void>();

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly platforms = signal<Platform[]>([]);
	protected readonly gameResults = signal<Game[]>([]);
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly showConfirmDelete = signal(false);

	private readonly searchSubject = new Subject<string>();

	protected readonly isEdit = signal(false);

	form = this.fb.group({
		gameId: ["", Validators.required],
		platformId: ["", Validators.required],
		score: [
			null as number | null,
			[Validators.required, Validators.min(0.01)]
		],
		duration: [
			null as number | null,
			[Validators.required, Validators.min(0.01)]
		],
		status: ["not_started"],
		startedAt: [null as string | null],
		finishedAt: [null as string | null],
		realDuration: [null as number | null],
		userRating: [null as number | null],
		notes: [""]
	});

	ngOnInit() {
		this.gamesService.getPlatforms().subscribe(p => this.platforms.set(p));

		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query =>
					query.length >= 2 ? this.gamesService.search(query) : of([])
				)
			)
			.subscribe(games => this.gameResults.set(games));

		const e = this.entry();
		if (e) {
			this.isEdit.set(true);
			this.selectedGame.set({
				id: e.game.id,
				title: e.game.title,
				coverUrl: e.game.coverUrl
			} as Game);
			this.form.patchValue({
				gameId: e.game.id,
				platformId: e.platform.id,
				score: e.score ?? null,
				duration: e.duration ?? null,
				status: e.status,
				startedAt: e.startedAt ? e.startedAt.split("T")[0] : null,
				finishedAt: e.finishedAt ? e.finishedAt.split("T")[0] : null,
				realDuration: e.realDuration ?? null,
				userRating: e.userRating ?? null,
				notes: e.notes ?? ""
			});
		}
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		this.searchSubject.next(query);
	}

	selectGame(game: Game) {
		this.selectedGame.set(game);
		this.form.patchValue({ gameId: game.id });
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
			const dto: UpdateBacklogDto = {
				status: val.status ?? undefined,
				score: val.score ?? undefined,
				duration: val.duration ?? undefined,
				startedAt: val.startedAt || null,
				finishedAt: val.finishedAt || null,
				realDuration: val.realDuration ?? undefined,
				userRating: val.userRating ?? undefined,
				notes: val.notes || undefined
			};
			this.backlogService.update(this.entry()!.id, dto).subscribe({
				next: () => this.saved.emit(),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateBacklogDto = {
				gameId: val.gameId!,
				platformId: val.platformId!,
				score: val.score!,
				duration: val.duration!,
				status: val.status ?? undefined,
				startedAt: val.startedAt || undefined,
				finishedAt: val.finishedAt || undefined,
				realDuration: val.realDuration ?? undefined,
				userRating: val.userRating ?? undefined,
				notes: val.notes || undefined
			};
			this.backlogService.create(dto).subscribe({
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
		this.backlogService.delete(this.entry()!.id).subscribe({
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
