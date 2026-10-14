import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type QueueEntry } from "../../../core/models/queue.model";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";

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
	readonly username = input.required<string>();
	readonly entries = input.required<QueueEntry[]>();
}
