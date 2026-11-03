import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";
import { NgpInput } from "ng-primitives/input";
import { NgpSearch, NgpSearchClear } from "ng-primitives/search";

export type UiSearchBarSize = "sm" | "md" | "lg";

const BOX_SIZE_CLASSES: Record<UiSearchBarSize, string> = {
	sm: "min-h-10 tap:min-h-[44px] max-sm:min-h-[44px]",
	md: "min-h-[44px]",
	lg: "min-h-[52px]"
};

const INPUT_SIZE_CLASSES: Record<UiSearchBarSize, string> = {
	sm: "py-2 text-sm",
	md: "py-2 text-sm",
	lg: "py-3 text-base"
};

@Component({
	selector: "ui-search-bar",
	imports: [NgpInput, NgpSearch, NgpSearchClear],
	template: `
		<div
			ngpSearch
			class="flex items-stretch bg-input-bg border border-line rounded-card px-4 transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-subtle)]"
			[class]="boxSizeClass()"
		>
			<span
				class="material-icons self-center text-xl text-fg-muted"
				aria-hidden="true"
				>search</span
			>
			<input
				ngpInput
				type="text"
				class="flex-1 min-w-0 bg-transparent border-0 px-2.5 text-fg outline-none placeholder:text-fg-muted"
				[class]="inputSizeClass()"
				[placeholder]="placeholder()"
				[attr.aria-label]="accessibleName()"
				[value]="value()"
				(input)="onInput($event)"
				(keydown.escape)="value.set('')"
			/>
			@if (value()) {
				<button
					ngpSearchClear
					type="button"
					class="tap-area self-center material-icons text-lg text-fg-muted hover:text-fg transition cursor-pointer"
					aria-label="Clear search"
					(click)="value.set('')"
				>
					close
				</button>
			}
		</div>
	`,
	host: { class: "block", "[attr.data-size]": "size()" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSearchBar {
	value = model("");
	placeholder = input("Search...");
	ariaLabel = input<string | null>(null);
	size = input<UiSearchBarSize>("md");

	protected readonly accessibleName = computed(
		() => this.ariaLabel() ?? this.placeholder().replace(/\.{3}$/, "")
	);
	protected readonly boxSizeClass = computed(
		() => BOX_SIZE_CLASSES[this.size()]
	);
	protected readonly inputSizeClass = computed(
		() => INPUT_SIZE_CLASSES[this.size()]
	);

	protected onInput(event: Event) {
		this.value.set((event.target as HTMLInputElement).value);
	}
}
