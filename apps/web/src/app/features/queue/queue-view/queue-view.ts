import { moveItemInArray } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type QueueEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiButton,
	UiDialog,
	UiInput,
	UiPlainEmptyState,
	UiPremiumBadge
} from "../../../shared/ui";
import { PendingRemovals } from "../../../shared/utils/pending-removals";
import { BacklogService } from "../../backlog/backlog";
import { FavoritesService } from "../../favorites/favorites";
import { QueueService } from "../queue";
import {
	QueueAddModal,
	type QueueAddModalData
} from "../queue-add-modal/queue-add-modal";
import {
	QueueBrowser,
	type QueueEntryMove
} from "../queue-browser/queue-browser";
import { type QueueSort, type QueueStatusChange } from "../queue-order";

@Component({
	selector: "app-queue-view",
	imports: [
		LibraryHero,
		QueueBrowser,
		UiPlainEmptyState,
		UiButton,
		UiDialog,
		UiInput,
		UiPremiumBadge,
		PremiumOnly
	],
	templateUrl: "./queue-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueView implements OnInit {
	private readonly queueService = inject(QueueService);
	private readonly backlogService = inject(BacklogService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly toast = inject(ToastService);
	private readonly dialogs = inject(DialogService);
	private readonly pendingRemovals = new PendingRemovals<QueueEntry>(
		entry => entry.backlog.id
	);

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly favoriteGameIds = this.favoritesService.favoriteIds;
	protected readonly entries = signal<QueueEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly sortBy = signal<QueueSort>("manual");
	protected readonly savingOrder = signal(false);
	protected readonly movingToTop = signal(false);
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

	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: entry.backlog.game.backgroundUrl,
			title: entry.backlog.game.title
		}))
	);

	saveCurrentOrder(orderedEntries: QueueEntry[]) {
		if (this.sortBy() === "manual" || this.savingOrder()) return;
		this.savingOrder.set(true);
		const backlogIds = this.serverOrder(orderedEntries);
		this.queueService.reorder(backlogIds).subscribe({
			next: updated => {
				this.entries.set(this.pendingRemovals.withoutPending(updated));
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
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.loadQueue();
	}

	toggleFavorite(gameId: string) {
		this.favoritesService.toggle(gameId).subscribe();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadQueue();
			return;
		}
		this.searchSubject.next(query);
	}

	openAddModal() {
		this.dialogs.open<QueueAddModalData>(QueueAddModal, {
			data: { onAdded: () => this.loadQueue() }
		});
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
		this.entries.set(this.pendingRemovals.hide(entry, this.entries()));
		this.total.set(Math.max(0, this.total() - 1));
		this.toast.pending({
			message: `Removed ${entry.backlog.game.title} from queue`,
			onCommit: () => {
				this.pendingRemovals.commit(entry);
				this.queueService
					.reorder(this.serverOrder(this.entries()))
					.subscribe();
			},
			onUndo: () => {
				this.entries.set(
					this.pendingRemovals.undo(entry, this.entries())
				);
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

	moveToTop(entry: QueueEntry) {
		if (this.movingToTop()) return;
		this.movingToTop.set(true);
		this.queueService.moveToTop(entry.backlog.id).subscribe({
			next: () => {
				this.movingToTop.set(false);
				this.loadQueue();
			},
			error: () => this.movingToTop.set(false)
		});
	}

	moveEntry({ fromIndex, toIndex }: QueueEntryMove) {
		const list = [...this.entries()];
		moveItemInArray(list, fromIndex, toIndex);
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
					const visible = this.pendingRemovals.withoutPending(
						res.data.queue
					);
					const hiddenCount = res.data.queue.length - visible.length;
					this.entries.set(visible);
					this.total.set(
						(res.data.total ?? res.data.queue.length) - hiddenCount
					);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}

	private reorder(list: QueueEntry[]) {
		const previous = this.entries();
		this.entries.set(list);
		this.queueService.reorder(this.serverOrder(list)).subscribe({
			next: updated =>
				this.entries.set(this.pendingRemovals.withoutPending(updated)),
			error: () => this.entries.set(previous)
		});
	}

	private serverOrder(visible: QueueEntry[]) {
		return this.pendingRemovals
			.withPending(visible)
			.map(entry => entry.backlog.id);
	}
}
