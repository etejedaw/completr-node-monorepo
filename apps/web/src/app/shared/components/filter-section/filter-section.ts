import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-filter-section",
	template: `
		<fieldset class="relative m-0 p-0 border-0 min-w-0">
			<legend
				class="float-left w-full mb-2.5 p-0 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-fg-muted"
			>
				{{ label() }}
			</legend>
			<div class="absolute right-0 top-0 empty:hidden leading-none">
				<ng-content select="[sectionAction]" />
			</div>
			<div class="clear-left">
				<ng-content />
			</div>
			@if (hint()) {
				<p
					class="m-0 mt-1.5 text-[0.6875rem] text-fg-muted text-pretty"
				>
					{{ hint() }}
				</p>
			}
		</fieldset>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterSection {
	readonly label = input.required<string>();
	readonly hint = input<string | null>(null);
}
