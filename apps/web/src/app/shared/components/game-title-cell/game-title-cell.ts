import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../game-poster/game-poster";
import { MoodTagsChips } from "../mood-tags-chips/mood-tags-chips";

@Component({
	selector: "app-game-title-cell",
	imports: [RouterLink, MoodTagsChips, GamePoster],
	template: `
		<div class="flex items-center gap-2 min-w-0">
			<app-game-poster
				[src]="coverUrl()"
				[title]="title()"
				[width]="200"
				[compact]="true"
				class="w-9 aspect-[2/3] rounded shrink-0 ring-1 ring-white/10"
			/>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-1.5 min-w-0">
					<a
						[routerLink]="['/games', code()]"
						(click)="$event.stopPropagation()"
						class="text-fg font-medium no-underline hover:text-brand line-clamp-1 min-w-0"
						>{{ title() }}</a
					>
					<ng-content select="[titleSuffix]" />
				</div>
				<app-mood-tags-chips
					[tags]="moodTags()"
					containerClass="mt-0.5"
				/>
				<ng-content />
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameTitleCell {
	coverUrl = input<string | null | undefined>();
	title = input.required<string>();
	code = input.required<string>();
	moodTags = input<string[] | null>();
}
