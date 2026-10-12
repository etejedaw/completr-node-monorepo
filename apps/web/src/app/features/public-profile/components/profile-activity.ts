import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import {
	activityIcon,
	activityIconColorClass,
	activityLabel
} from "../../../shared/utils/activity-labels";
import { type PublicActivity } from "../public-profile.service";

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric"
});

@Component({
	selector: "app-profile-activity",
	imports: [RouterLink, GamePoster],
	template: `
		<ol class="list-none m-0 p-0 divide-y divide-line">
			@for (activity of activities(); track activity.id) {
				<li class="flex items-center gap-3 py-3">
					@if (activity.game; as game) {
						<a
							class="shrink-0"
							[routerLink]="['/games', game.code]"
							tabindex="-1"
							[attr.aria-label]="game.name"
						>
							<app-game-poster
								[src]="game.backgroundUrl"
								[title]="game.name"
								[width]="200"
								[compact]="true"
								class="w-9 aspect-[2/3] rounded ring-1 ring-white/10"
							/>
						</a>
					} @else {
						<span
							aria-hidden="true"
							class="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full bg-surface border border-line"
						>
							<span
								class="material-icons text-base"
								[class]="iconColor(activity.type)"
								>{{ icon(activity.type) }}</span
							>
						</span>
					}
					<p
						class="flex-1 min-w-0 m-0 text-sm leading-snug text-fg-muted first-letter:uppercase"
					>
						{{
							activity.type === "coop_tagged"
								? "played co-op"
								: label(activity.type)
						}}
						@if (activity.target; as target) {
							{{ " " }}
							@if (target.type === "game") {
								<a
									class="font-medium text-fg no-underline hover:text-brand"
									[routerLink]="['/games', target.code]"
									>{{ target.name }}</a
								>
							} @else if (target.type === "list") {
								<a
									class="font-medium text-fg no-underline hover:text-brand"
									[routerLink]="['/lists', target.id]"
									>{{ target.name }}</a
								>
							} @else {
								<a
									class="font-medium text-fg no-underline hover:text-brand"
									[routerLink]="['/user', target.username]"
									>{{ target.name }}</a
								>
							}
						} @else if (activity.game; as game) {
							{{ " " }}
							<a
								class="font-medium text-fg no-underline hover:text-brand"
								[routerLink]="['/games', game.code]"
								>{{ game.name }}</a
							>
						}
					</p>
					@if (activity.game) {
						<span
							aria-hidden="true"
							class="material-icons text-base shrink-0"
							[class]="iconColor(activity.type)"
							>{{ icon(activity.type) }}</span
						>
					}
					<time
						class="shrink-0 w-14 text-right text-xs text-fg-muted tabular-nums"
						[attr.datetime]="activity.createdAt"
						>{{ date(activity.createdAt) }}</time
					>
				</li>
			}
		</ol>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileActivity {
	readonly activities = input.required<PublicActivity[]>();

	protected readonly label = activityLabel;
	protected readonly icon = activityIcon;
	protected readonly iconColor = activityIconColorClass;

	protected date(value: string): string {
		return DATE_FORMAT.format(new Date(value));
	}
}
