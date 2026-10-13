import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	OptionPicker,
	type PickerOption
} from "../option-picker/option-picker";

export interface PageSection {
	id: string;
	label: string;
	icon: string;
}

@Component({
	selector: "app-page-toc",
	imports: [RouterLink, OptionPicker],
	template: `
		@if (variant() === "rail") {
			<nav [attr.aria-label]="label()">
				<p
					class="m-0 mb-3 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-fg-muted"
				>
					On this page
				</p>
				<ol
					class="m-0 p-0 list-none flex flex-col border-l border-line"
				>
					@for (
						section of sections();
						track section.id;
						let i = $index
					) {
						<li>
							<a
								[routerLink]="path()"
								[fragment]="section.id"
								class="-ml-px flex items-center gap-3 min-h-[40px] tap:min-h-[44px] pl-4 pr-3 border-l-2 no-underline text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand"
								[class]="
									section.id === active()
										? 'border-brand text-fg font-semibold'
										: 'border-transparent text-fg-muted hover:text-fg hover:border-line-hover'
								"
								[attr.aria-current]="
									section.id === active() ? 'location' : null
								"
								(click)="selected.emit(section.id)"
							>
								<span
									class="w-5 text-[0.6875rem] tabular-nums"
									[class.text-brand]="section.id === active()"
									>{{ pad(i + 1) }}</span
								>
								{{ section.label }}
							</a>
						</li>
					}
				</ol>
			</nav>
		} @else {
			<app-option-picker
				label="On this page"
				[heading]="label()"
				[options]="pickerOptions()"
				[value]="active()"
				(valueChange)="selected.emit($event)"
			/>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageToc {
	readonly sections = input.required<readonly PageSection[]>();
	readonly path = input.required<string>();
	readonly label = input.required<string>();
	readonly active = input.required<string>();
	readonly variant = input<"rail" | "chips">("rail");

	readonly selected = output<string>();

	protected readonly pickerOptions = computed<PickerOption[]>(() =>
		this.sections().map((section, index) => ({
			value: section.id,
			label: section.label,
			icon: section.icon,
			hint: this.pad(index + 1),
			link: this.path(),
			fragment: section.id
		}))
	);

	protected pad(n: number): string {
		return n.toString().padStart(2, "0");
	}
}
