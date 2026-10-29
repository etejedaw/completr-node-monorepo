import { CdkDrag, type CdkDragDrop, CdkDropList } from "@angular/cdk/drag-drop";
import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	contentChild,
	inject,
	input,
	model,
	output,
	TemplateRef
} from "@angular/core";

import { type QueueEntry } from "../../../core/models";
import { type ExportParams } from "../../../core/services/export";
import { PointerService } from "../../../core/services/pointer";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { SwipeActions } from "../../../shared/directives/swipe-actions";
import {
	UiButton,
	UiPagination,
	UiPlainEmptyState,
	UiSearchBar
} from "../../../shared/ui";
import { QueueListSection } from "../queue-list-section/queue-list-section";
import { QueueNextCard } from "../queue-next-card/queue-next-card";
import {
	queueFeaturedEyebrow,
	type QueueSort,
	sortQueueEntries
} from "../queue-order";
import { QueueRow } from "../queue-row/queue-row";
import { QueueSkeleton } from "../queue-skeleton/queue-skeleton";
import { QueueSortControl } from "../queue-sort-control/queue-sort-control";
import { type QueueEntryMove } from "./queue-browser.model";

@Component({
	selector: "app-queue-browser",
	imports: [
		ExportActions,
		NgTemplateOutlet,
		CdkDropList,
		CdkDrag,
		LibraryToolbar,
		QueueListSection,
		QueueNextCard,
		QueueRow,
		QueueSkeleton,
		QueueSortControl,
		SwipeActions,
		UiButton,
		UiPagination,
		UiPlainEmptyState,
		UiSearchBar
	],
	templateUrl: "./queue-browser.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueBrowser {
	readonly entries = input.required<QueueEntry[]>();
	readonly queueIsEmpty = input.required<boolean>();
	readonly isLoading = input.required<boolean>();
	readonly searchQuery = input.required<string>();
	readonly searchPlaceholder = input.required<string>();
	readonly noMatchesScope = input.required<string>();
	readonly offset = input.required<number>();
	readonly limit = input.required<number>();
	readonly total = input.required<number>();
	readonly readonly = input(false);
	readonly manualLabel = input("My order");
	readonly favoriteGameIds = input<ReadonlySet<string>>(new Set());
	readonly updatingBacklogIds = input<ReadonlySet<string>>(new Set());
	readonly savingOrder = input(false);
	readonly movingToTop = input(false);
	readonly sortBy = model<QueueSort>("manual");
	protected readonly exportParams = computed<ExportParams>(() => ({
		search: this.searchQuery().trim() || undefined,
		sort: this.sortBy()
	}));

	readonly searchChange = output<string>();
	readonly offsetChange = output<number>();
	readonly saveOrder = output<QueueEntry[]>();
	readonly startPlaying = output<QueueEntry>();
	readonly favoriteToggle = output<string>();
	readonly remove = output<QueueEntry>();
	readonly moveToTop = output<QueueEntry>();
	readonly moveUp = output<number>();
	readonly moveDown = output<number>();
	readonly entryMove = output<QueueEntryMove>();

	protected readonly emptyQueueTemplate = contentChild.required(
		"emptyQueue",
		{ read: TemplateRef }
	);

	protected readonly pointer = inject(PointerService);

	protected readonly sortedEntries = computed(() =>
		sortQueueEntries(this.entries(), this.sortBy())
	);
	protected readonly featured = computed(() => {
		if (this.offset() > 0 || this.searchQuery().trim()) return null;
		return this.sortedEntries()[0] ?? null;
	});
	protected readonly rest = computed(() =>
		this.featured() ? this.sortedEntries().slice(1) : this.sortedEntries()
	);
	protected readonly restOffset = computed(() => (this.featured() ? 1 : 0));
	protected readonly isManual = computed(() => this.sortBy() === "manual");
	protected readonly featuredEyebrow = computed(() =>
		queueFeaturedEyebrow(this.sortBy())
	);
	protected readonly noMatchesMessage = computed(
		() =>
			`Nothing in ${this.noMatchesScope()} matches "${this.searchQuery().trim()}".`
	);

	protected isFavorite(entry: QueueEntry): boolean {
		return this.favoriteGameIds().has(entry.backlog.game.id);
	}

	protected isUpdatingStatus(entry: QueueEntry): boolean {
		return this.updatingBacklogIds().has(entry.backlog.id);
	}

	protected onDrop(event: CdkDragDrop<QueueEntry[]>) {
		if (!this.isManual()) return;
		if (event.previousIndex === event.currentIndex) return;
		const shift = this.restOffset();
		this.entryMove.emit({
			fromIndex: event.previousIndex + shift,
			toIndex: event.currentIndex + shift
		});
	}
}
