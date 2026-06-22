import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";
import { NgpInput } from "ng-primitives/input";
import { NgpSearch, NgpSearchClear } from "ng-primitives/search";

@Component({
	selector: "ui-search-bar",
	imports: [NgpInput, NgpSearch, NgpSearchClear],
	template: `
		<div
			ngpSearch
			class="flex items-center bg-input-bg border border-line rounded-card px-4 transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-subtle)]"
		>
			<span class="material-icons text-xl text-fg-muted">search</span>
			<input
				ngpInput
				type="search"
				class="flex-1 bg-transparent border-0 px-2.5 py-3 text-fg text-base outline-none placeholder:text-fg-muted"
				[placeholder]="placeholder()"
				[value]="value()"
				(input)="onInput($event)"
				(keydown.escape)="value.set('')"
			/>
			@if (value()) {
				<button
					ngpSearchClear
					type="button"
					class="material-icons text-lg text-fg-muted hover:text-fg transition cursor-pointer"
					aria-label="Clear search"
					(click)="value.set('')"
				>
					close
				</button>
			}
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSearchBar {
	value = model("");
	placeholder = input("Search...");

	protected onInput(event: Event) {
		this.value.set((event.target as HTMLInputElement).value);
	}
}
