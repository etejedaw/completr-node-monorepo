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

const PLAYING_NOW_LIMIT = 12;

@Component({
	selector: "app-profile-playing-now",
	imports: [GameCoverCard, PosterShelf],
	template: `
		@if (entries().length > 0) {
			<app-poster-shelf
				[contained]="true"
				heading="Playing now"
				eyebrow="In progress"
				seeAllLabel="See all"
				[seeAllLink]="['/user', username(), 'backlog']"
				[seeAllQueryParams]="{ status: 'playing' }"
			>
				@for (entry of entries(); track entry.id) {
					<app-game-cover-card
						class="w-32 sm:w-40"
						[game]="entry.game"
						[ratio]="entry.ratio"
						[subtitle]="entry.platform.abbreviation"
					/>
				}
			</app-poster-shelf>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePlayingNow {
	private readonly libraryService = inject(PublicLibraryService);

	readonly username = input.required<string>();

	private readonly playing = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) =>
			this.libraryService
				.getUserBacklog(username, {
					status: "playing",
					sort_by: "startedAt",
					sort_order: "desc",
					limit: PLAYING_NOW_LIMIT
				})
				.pipe(
					map(page => page.items),
					catchError(() => of([]))
				)
	});

	protected readonly entries = computed(() =>
		this.playing.hasValue() ? this.playing.value() : []
	);
}
