import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

export interface FeaturedList {
	id: string;
	name: string;
	description?: string;
	isOfficial: boolean;
	completed: boolean;
	owner: { username: string } | null;
}

@Component({
	selector: "app-game-featured-lists",
	imports: [RouterLink],
	template: `
		<ul class="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
			@for (list of sortedLists(); track list.id) {
				<li>
					<a
						class="group flex items-start gap-3 h-full p-4 rounded-card border no-underline transition hover:-translate-y-0.5 hover:border-brand/60"
						[class]="
							list.isOfficial
								? 'border-brand/40 bg-[linear-gradient(135deg,var(--color-brand-subtle),transparent_70%)]'
								: 'border-line bg-surface/60'
						"
						[routerLink]="['/lists', list.id]"
					>
						<span
							class="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
							[class]="
								list.isOfficial
									? 'bg-brand text-white shadow-lg shadow-brand/30'
									: 'bg-nav-lists/15 text-nav-lists'
							"
						>
							<span aria-hidden="true" class="material-icons">{{
								list.isOfficial
									? "verified"
									: "format_list_bulleted"
							}}</span>
						</span>
						<span class="flex-1 min-w-0 flex flex-col gap-1">
							<span class="flex items-center gap-1.5">
								<span
									class="text-sm font-semibold text-fg truncate transition group-hover:text-brand"
									>{{ list.name }}</span
								>
								@if (list.isOfficial) {
									<span
										class="shrink-0 px-1.5 py-px rounded-full bg-brand/15 text-brand text-[0.5625rem] font-bold uppercase tracking-wider"
										>Official</span
									>
								}
							</span>
							@if (list.description) {
								<span
									class="text-xs text-fg-muted leading-snug line-clamp-2"
									>{{ list.description }}</span
								>
							}
							<span
								class="mt-auto pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-fg-muted"
							>
								@if (list.owner) {
									<span
										>by &#64;{{ list.owner.username }}</span
									>
								}
								@if (list.completed) {
									<span
										class="inline-flex items-center gap-0.5 text-success font-semibold"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm"
											>emoji_events</span
										>
										You completed it
									</span>
								}
							</span>
						</span>
					</a>
				</li>
			}
		</ul>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameFeaturedLists {
	readonly lists = input.required<FeaturedList[]>();

	protected readonly sortedLists = computed(() =>
		[...this.lists()].sort(
			(a, b) => Number(b.isOfficial) - Number(a.isOfficial)
		)
	);
}
