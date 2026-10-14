import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	UiButton,
	UiPagination,
	UiPlainEmptyState,
	UiSearchBar
} from "../../../shared/ui";
import { QueueListSection } from "../../queue/queue-list-section/queue-list-section";
import { QueueNextCard } from "../../queue/queue-next-card/queue-next-card";
import {
	queueFeaturedEyebrow,
	type QueueSort,
	sortQueueEntries
} from "../../queue/queue-order";
import { QueueRow } from "../../queue/queue-row/queue-row";
import { QueueSkeleton } from "../../queue/queue-skeleton/queue-skeleton";
import { QueueSortControl } from "../../queue/queue-sort-control/queue-sort-control";
import { ProfileAccessState } from "../components/profile-access-state";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

const QUEUE_PAGE_SIZE = 100;

@Component({
	selector: "app-user-queue",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		ProfileAccessState,
		QueueListSection,
		QueueNextCard,
		QueueRow,
		QueueSkeleton,
		QueueSortControl,
		UiButton,
		UiPagination,
		UiPlainEmptyState,
		UiSearchBar
	],
	templateUrl: "./user-queue.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserQueue {
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly collection = injectPublicCollection<QueueEntry>(
		(username, pagination) =>
			this.libraryService.getUserQueue(username, pagination),
		entry => entry.backlog.game,
		{ limit: QUEUE_PAGE_SIZE }
	);

	protected readonly sortBy = signal<QueueSort>("manual");
	protected readonly sortedEntries = computed(() =>
		sortQueueEntries(this.collection.visibleItems(), this.sortBy())
	);
	protected readonly featured = computed(() => {
		if (this.collection.offset() > 0 || this.collection.query().trim()) {
			return null;
		}
		return this.sortedEntries()[0] ?? null;
	});
	protected readonly rest = computed(() =>
		this.featured() ? this.sortedEntries().slice(1) : this.sortedEntries()
	);
	protected readonly restOffset = computed(() => (this.featured() ? 1 : 0));
	protected readonly noMatchesMessage = computed(
		() =>
			`Nothing in their Up Next matches "${this.collection.query().trim()}".`
	);
	protected readonly featuredEyebrow = computed(() =>
		queueFeaturedEyebrow(this.sortBy())
	);
}
