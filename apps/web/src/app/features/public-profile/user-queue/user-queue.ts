import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { UiButton, UiPlainEmptyState } from "../../../shared/ui";
import { QueueBrowser } from "../../queue/queue-browser/queue-browser";
import { ProfileAccessState } from "../components/profile-access-state";
import { injectPublicCollection } from "../services/public-collection";
import { PublicLibraryService } from "../services/public-library.service";

const QUEUE_PAGE_SIZE = 100;

@Component({
	selector: "app-user-queue",
	imports: [
		RouterLink,
		LibraryHero,
		ProfileAccessState,
		QueueBrowser,
		UiButton,
		UiPlainEmptyState
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
}
