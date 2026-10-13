import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, map, of } from "rxjs";

import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import { PublicLibraryService } from "../services/public-library.service";

const UP_NEXT_LIMIT = 10;

@Component({
	selector: "app-profile-up-next",
	imports: [GameCoverCard, PosterShelf],
	template: `
		@if (entries().length > 0) {
			<app-poster-shelf
				[contained]="true"
				heading="Up Next"
				eyebrow="Playing soon"
				seeAllLabel="See all"
				[seeAllLink]="['/user', username(), 'queue']"
			>
				@for (entry of entries(); track entry.id; let rank = $index) {
					<app-game-cover-card
						class="w-32 sm:w-40"
						[game]="entry.backlog.game"
						[ratio]="entry.backlog.ratio"
						[topLeftBadge]="'#' + (rank + 1)"
						[subtitle]="entry.backlog.platform?.abbreviation"
					/>
				}
			</app-poster-shelf>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileUpNext {
	private readonly libraryService = inject(PublicLibraryService);

	readonly username = input.required<string>();

	private readonly queue = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) =>
			this.libraryService
				.getUserQueue(username, { limit: UP_NEXT_LIMIT })
				.pipe(
					map(page => page.items),
					catchError(() => of([]))
				)
	});

	protected readonly entries = computed(() =>
		this.queue.hasValue() ? this.queue.value() : []
	);
}
