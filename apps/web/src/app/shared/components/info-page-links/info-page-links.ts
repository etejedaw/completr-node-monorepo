import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type InfoPageId, type InfoPageLink } from "./info-page-links.model";

const INFO_PAGE_LINKS: readonly InfoPageLink[] = [
	{
		id: "help",
		route: "/help",
		icon: "menu_book",
		label: "Guide",
		hint: "How Completr works"
	},
	{
		id: "whats-new",
		route: "/whats-new",
		icon: "campaign",
		label: "What's new",
		hint: "Every update, newest first"
	},
	{
		id: "about",
		route: "/about",
		icon: "info_outline",
		label: "About",
		hint: "Who builds it and with what"
	},
	{
		id: "privacy",
		route: "/privacy",
		icon: "policy",
		label: "Privacy Policy",
		hint: "What we store and why"
	}
];

export const FEEDBACK_EMAIL = "completr@etejeda.dev";

@Component({
	selector: "app-info-page-links",
	imports: [RouterLink],
	template: `
		<nav
			aria-label="More about Completr"
			class="mt-14 pt-8 border-t border-line"
		>
			<ul class="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-3 gap-3">
				@for (link of links(); track link.id) {
					<li>
						<a
							[routerLink]="link.route"
							class="group flex items-center gap-3 h-full min-h-[44px] p-4 rounded-card border border-line bg-surface/40 no-underline transition-colors hover:border-line-hover hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
						>
							<span
								aria-hidden="true"
								class="material-icons flex items-center justify-center w-10 h-10 rounded-full bg-input-bg text-fg-secondary text-[1.25rem] transition-colors group-hover:text-brand"
								>{{ link.icon }}</span
							>
							<span class="flex-1 min-w-0">
								<span
									class="block text-sm font-semibold text-fg"
									>{{ link.label }}</span
								>
								<span class="block text-xs text-fg-muted">{{
									link.hint
								}}</span>
							</span>
							<span
								aria-hidden="true"
								class="material-icons text-base text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
								>arrow_forward</span
							>
						</a>
					</li>
				}
			</ul>
			<p class="m-0 mt-6 text-center text-xs text-fg-muted">
				Found a bug or have an idea?{{ " " }}
				<a
					[href]="'mailto:' + feedbackEmail"
					class="tap-area text-brand no-underline hover:underline"
					>{{ feedbackEmail }}</a
				>
			</p>
		</nav>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfoPageLinks {
	readonly current = input.required<InfoPageId>();

	protected readonly feedbackEmail = FEEDBACK_EMAIL;
	protected readonly links = computed(() =>
		INFO_PAGE_LINKS.filter(link => link.id !== this.current())
	);
}
