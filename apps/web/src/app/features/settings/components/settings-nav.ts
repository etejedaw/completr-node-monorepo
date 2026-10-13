import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { SETTINGS_SECTIONS } from "../settings-sections";

@Component({
	selector: "app-settings-nav",
	imports: [RouterLink, RouterLinkActive],
	template: `
		@if (variant() === "rail") {
			<nav aria-label="Settings sections">
				<ul class="m-0 p-0 list-none flex flex-col gap-1">
					@for (section of sections; track section.path) {
						<li>
							<a
								class="group flex items-center gap-3 min-h-[52px] px-3 py-2 rounded-card border border-transparent no-underline text-fg-secondary transition hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
								[routerLink]="['/settings', section.path]"
								routerLinkActive="!bg-surface !border-line !text-fg"
								ariaCurrentWhenActive="page"
								#link="routerLinkActive"
							>
								<span
									aria-hidden="true"
									class="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-md transition"
									[class]="
										link.isActive
											? 'bg-brand-subtle text-brand'
											: 'bg-input-bg text-fg-muted group-hover:text-fg'
									"
								>
									<span class="material-icons text-lg">{{
										section.icon
									}}</span>
								</span>
								<span class="min-w-0">
									<span
										class="block text-sm font-semibold leading-tight"
										>{{ section.label }}</span
									>
									<span
										class="block mt-0.5 text-xs text-fg-muted truncate"
										>{{ section.description }}</span
									>
								</span>
							</a>
						</li>
					}
				</ul>
			</nav>
		} @else {
			<nav
				aria-label="Settings sections"
				class="-mx-1 px-1 overflow-x-auto [scrollbar-width:none]"
			>
				<ul class="m-0 p-0 list-none flex gap-2 w-max">
					@for (section of sections; track section.path) {
						<li>
							<a
								class="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border border-line text-[0.8125rem] font-medium whitespace-nowrap no-underline text-fg-secondary transition-colors hover:border-line-hover hover:text-fg"
								[routerLink]="['/settings', section.path]"
								routerLinkActive="!border-brand !bg-brand-subtle !text-brand"
								ariaCurrentWhenActive="page"
							>
								<span
									aria-hidden="true"
									class="material-icons text-base"
									>{{ section.icon }}</span
								>
								{{ section.label }}
							</a>
						</li>
					}
				</ul>
			</nav>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsNav {
	readonly variant = input<"rail" | "chips">("rail");

	protected readonly sections = SETTINGS_SECTIONS;
}
