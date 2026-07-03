import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MoodTagsChips } from "../mood-tags-chips/mood-tags-chips";

@Component({
	selector: "app-game-title-cell",
	imports: [RouterLink, MoodTagsChips],
	template: `
		<div class="flex items-center gap-2 min-w-0">
			@if (coverUrl()) {
				<img
					[src]="coverUrl()"
					[alt]="title()"
					class="w-8 h-10 object-cover rounded shrink-0"
					loading="lazy"
				/>
			} @else {
				<div class="w-8 h-10 bg-input-bg rounded shrink-0"></div>
			}
			<div class="min-w-0 flex-1">
				<a
					[routerLink]="['/games', code()]"
					(click)="$event.stopPropagation()"
					class="text-fg font-medium no-underline hover:text-brand line-clamp-1 block"
					>{{ title() }}</a
				>
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
