import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { QueueEntry } from "../../../core/models";
import { QueueService } from "../queue.service";
import { BacklogService } from "../../backlog/backlog.service";
import { ToastService } from "../../../core/services/toast.service";
import { QueueAddModal } from "../queue-add-modal/queue-add-modal";
import { UiButton, UiPagination, UiSearchBar } from "../../../shared/ui";
import {
	QueueGridCard,
	QueueStatusChange
} from "../../../shared/components/queue-grid-card/queue-grid-card";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

@Component({
	selector: "app-queue-view",
	imports: [QueueAddModal, UiButton, UiPagination, UiSearchBar, QueueGridCard],
	templateUrl: "./queue-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueView implements OnInit {
	private readonly queueService = inject(QueueService);
	private readonly backlogService = inject(BacklogService);
	private readonly toast = inject(ToastService);

	protected readonly entries = signal<QueueEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly showAddModal = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly sortBy = signal<
		"manual" | "ratio" | "score" | "duration"
	>("manual");
	protected readonly savingOrder = signal(false);
	protected readonly updatingStatusIds = signal<Set<string>>(new Set());
	protected readonly pendingPlayEntry = signal<QueueEntry | null>(null);
	protected readonly pendingPlayStartedAt = signal<string>("");

	private today(): string {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadQueue();
	}

	setSort(sort: "manual" | "ratio" | "score" | "duration") {
		this.sortBy.set(sort);
	}

	protected readonly filteredEntries = computed(() => {
		const sort = this.sortBy();
		const list = this.entries();
		if (sort === "manual") return list;
		const sorted = [...list];
		if (sort === "ratio") {
			sorted.sort(
				(a, b) => (b.backlog.ratio ?? -1) - (a.backlog.ratio ?? -1)
			);
		} else if (sort === "score") {
			sorted.sort(
				(a, b) => (b.backlog.score ?? -1) - (a.backlog.score ?? -1)
			);
		} else if (sort === "duration") {
			sorted.sort(
				(a, b) =>
					(a.backlog.duration ?? Number.POSITIVE_INFINITY) -
					(b.backlog.duration ?? Number.POSITIVE_INFINITY)
			);
		}
		return sorted;
	});

	saveCurrentOrder() {
		if (this.sortBy() === "manual" || this.savingOrder()) return;
		this.savingOrder.set(true);
		const backlogIds = this.filteredEntries().map(e => e.backlog.id);
		this.queueService.reorder(backlogIds).subscribe({
			next: updated => {
				this.entries.set(updated);
				this.sortBy.set("manual");
				this.savingOrder.set(false);
			},
			error: () => this.savingOrder.set(false)
		});
	}

	private readonly searchSubject = new Subject<string>();

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadQueue();
			});
		this.loadQueue();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.searchSubject.next(query);
	}

	openAddModal() {
		this.showAddModal.set(true);
	}

	onAddModalClosed() {
		this.showAddModal.set(false);
	}

	onAddModalSaved() {
		this.loadQueue();
	}

	isUpdatingStatus(entry: QueueEntry): boolean {
		return this.updatingStatusIds().has(entry.backlog.id);
	}

	requestStatusChange(entry: QueueEntry, status: QueueStatusChange) {
		if (status === "playing") {
			this.pendingPlayStartedAt.set(this.today());
			this.pendingPlayEntry.set(entry);
		}
	}

	onPendingPlayStartedAtChange(value: string) {
		this.pendingPlayStartedAt.set(value);
	}

	cancelPlayConfirmation() {
		this.pendingPlayEntry.set(null);
	}

	confirmPlay() {
		const entry = this.pendingPlayEntry();
		if (!entry) return;
		const startedAt = this.pendingPlayStartedAt() || null;
		this.pendingPlayEntry.set(null);
		this.applyStatusChange(entry, "playing", startedAt);
	}

	private applyStatusChange(
		entry: QueueEntry,
		status: QueueStatusChange,
		startedAt: string | null = null
	) {
		const backlogId = entry.backlog.id;
		if (this.updatingStatusIds().has(backlogId)) return;

		const updating = new Set(this.updatingStatusIds());
		updating.add(backlogId);
		this.updatingStatusIds.set(updating);

		const clearUpdating = () => {
			const next = new Set(this.updatingStatusIds());
			next.delete(backlogId);
			this.updatingStatusIds.set(next);
		};

		const payload: { status: string; startedAt?: string } = { status };
		if (startedAt) payload.startedAt = startedAt;

		this.backlogService.update(backlogId, payload).subscribe({
			next: ({ queueRemoved }) => {
				if (queueRemoved) {
					this.entries.set(
						this.entries().filter(e => e.backlog.id !== backlogId)
					);
					this.total.set(Math.max(0, this.total() - 1));
				}
				clearUpdating();
			},
			error: clearUpdating
		});
	}

	remove(entry: QueueEntry) {
		this.entries.set(this.entries().filter(e => e.id !== entry.id));
		this.total.set(Math.max(0, this.total() - 1));
		this.toast.pending({
			message: `Removed ${entry.backlog.game.title} from queue`,
			onCommit: () => {
				const ids = this.entries().map(e => e.backlog.id);
				this.queueService.reorder(ids).subscribe();
			},
			onUndo: () => {
				const restored = [...this.entries(), entry].sort(
					(a, b) => a.position - b.position
				);
				this.entries.set(restored);
				this.total.set(this.total() + 1);
			}
		});
	}

	moveUp(index: number) {
		if (index === 0) return;
		const list = [...this.entries()];
		[list[index - 1], list[index]] = [list[index], list[index - 1]];
		this.reorder(list);
	}

	moveDown(index: number) {
		if (index >= this.entries().length - 1) return;
		const list = [...this.entries()];
		[list[index], list[index + 1]] = [list[index + 1], list[index]];
		this.reorder(list);
	}

	private loadQueue() {
		this.isLoading.set(true);
		this.queueService
			.getMyQueuePaged({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.queue);
					this.total.set(res.data.total ?? res.data.queue.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}

	private reorder(list: QueueEntry[]) {
		const backlogIds = list.map(e => e.backlog.id);
		this.queueService.reorder(backlogIds).subscribe(updated => {
			this.entries.set(updated);
		});
	}
}
