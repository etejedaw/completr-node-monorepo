import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
	NavigationEnd,
	Router,
	RouterLink,
	RouterLinkActive
} from "@angular/router";
import { filter, map } from "rxjs";

import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../shared/components/option-picker/option-picker.model";
import { SETTINGS_SECTIONS } from "../settings-sections";

function settingsSectionOf(url: string): string {
	return url.split("?")[0]!.split("#")[0]!.split("/")[2] ?? "";
}

@Component({
	selector: "app-settings-nav",
	imports: [RouterLink, RouterLinkActive, OptionPicker],
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
			<app-option-picker
				label="Section"
				heading="Settings"
				[options]="pickerOptions"
				[value]="currentPath()"
			/>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsNav {
	readonly variant = input<"rail" | "chips">("rail");

	private readonly router = inject(Router);

	protected readonly sections = SETTINGS_SECTIONS;
	protected readonly pickerOptions: readonly PickerOption[] =
		SETTINGS_SECTIONS.map(section => ({
			value: section.path,
			label: section.label,
			icon: section.icon,
			hint: section.description,
			link: `/settings/${section.path}`
		}));
	protected readonly currentPath = toSignal(
		this.router.events.pipe(
			filter(event => event instanceof NavigationEnd),
			map(() => settingsSectionOf(this.router.url))
		),
		{ initialValue: settingsSectionOf(this.router.url) }
	);
}
