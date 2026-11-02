import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { map, type Observable, of, switchMap, tap } from "rxjs";

import { type BacklogEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiButton, UiDialog, UiPlainEmptyState } from "../../../shared/ui";
import { QueueService } from "../../queue/queue";
import { BacklogService } from "../backlog";
import { type BacklogFilters } from "../backlog.model";

type PickState = "loading" | "ready" | "empty" | "error";

const UNPLAYED_STATUS = "not_started";
const STABLE_ORDER = { sort_by: "createdAt", sort_order: "asc" } as const;

@Component({
	selector: "app-surprise-me",
	imports: [RouterLink, GamePoster, UiButton, UiDialog, UiPlainEmptyState],
	templateUrl: "./surprise-me.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SurpriseMe implements OnInit {
	filters = input.required<BacklogFilters>();
	queuedBacklogIds = input<ReadonlySet<string>>(new Set());
	closed = output<void>();
	queued = output<void>();

	private readonly backlogService = inject(BacklogService);
	private readonly queueService = inject(QueueService);

	protected readonly state = signal<PickState>("loading");
	protected readonly pick = signal<BacklogEntry | null>(null);
	protected readonly candidateCount = signal<number | null>(null);
	protected readonly queueing = signal(false);
	protected readonly queueError = signal<string | null>(null);

	protected readonly revealedPick = computed(() => {
		const pick = this.pick();
		return pick ? [pick] : [];
	});
	protected readonly isPickQueued = computed(() => {
		const pick = this.pick();
		return !!pick && this.queuedBacklogIds().has(pick.id);
	});
	protected readonly onlyUnplayed = computed(() => !this.filters().status);

	private readonly candidateFilters = computed<BacklogFilters>(() => ({
		...this.filters(),
		status: this.filters().status ?? UNPLAYED_STATUS,
		...STABLE_ORDER
	}));
	private lastOffset: number | null = null;

	ngOnInit(): void {
		this.spin();
	}

	protected spin(): void {
		this.state.set("loading");
		this.queueError.set(null);
		this.countCandidates()
			.pipe(
				switchMap(total =>
					total === 0
						? of(null)
						: this.fetchCandidateAt(this.nextOffset(total))
				)
			)
			.subscribe({
				next: entry => {
					this.pick.set(entry);
					this.state.set(entry ? "ready" : "empty");
				},
				error: () => this.state.set("error")
			});
	}

	protected addToQueue(): void {
		const pick = this.pick();
		if (!pick || this.queueing()) return;
		this.queueing.set(true);
		this.queueError.set(null);
		this.queueService.addFromBacklog(pick.id).subscribe({
			next: () => {
				this.queueing.set(false);
				this.queued.emit();
			},
			error: (error: HttpErrorResponse) => {
				this.queueing.set(false);
				this.queueError.set(
					error.error?.detail ?? "Couldn't add this game to Up Next."
				);
			}
		});
	}

	protected close(): void {
		this.closed.emit();
	}

	private countCandidates(): Observable<number> {
		const known = this.candidateCount();
		if (known !== null) return of(known);
		return this.backlogService
			.getMyBacklog({ ...this.candidateFilters(), limit: 1, offset: 0 })
			.pipe(
				map(response => response.data.total),
				tap(total => this.candidateCount.set(total))
			);
	}

	private fetchCandidateAt(offset: number): Observable<BacklogEntry | null> {
		return this.backlogService
			.getMyBacklog({ ...this.candidateFilters(), limit: 1, offset })
			.pipe(map(response => response.data.backlog[0] ?? null));
	}

	private nextOffset(total: number): number {
		const offset =
			this.lastOffset === null || total === 1
				? Math.floor(Math.random() * total)
				: (this.lastOffset +
						1 +
						Math.floor(Math.random() * (total - 1))) %
					total;
		this.lastOffset = offset;
		return offset;
	}
}
