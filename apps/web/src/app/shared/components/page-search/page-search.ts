import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { UiSearchBar } from "../../ui";
import { type UiSearchBarSize } from "../../ui/search-bar/ui-search-bar";

const countFormat = new Intl.NumberFormat("en-US");

@Component({
	selector: "app-page-search",
	imports: [UiSearchBar],
	template: `
		<ui-search-bar
			icon="filter_list"
			[size]="size()"
			[placeholder]="placeholder()"
			[ariaLabel]="accessibleName()"
			[hint]="matches()"
			[value]="value()"
			(valueChange)="valueChange.emit($event)"
		/>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageSearch {
	readonly noun = input.required<string>();
	readonly nounPlural = input<string | null>(null);
	readonly filterBy = input("title");
	readonly count = input<number | null>(null);
	readonly loading = input(false);
	readonly ariaLabel = input<string | null>(null);
	readonly size = input<UiSearchBarSize>("md");
	readonly value = input("");

	readonly valueChange = output<string>();

	private readonly knownCount = computed(() =>
		this.loading() ? null : this.count()
	);

	private readonly plural = computed(
		() => this.nounPlural() ?? `${this.noun()}s`
	);

	protected readonly placeholder = computed(() => {
		const count = this.knownCount();
		if (count === null)
			return `Filter ${this.plural()} by ${this.filterBy()}`;
		return `Filter ${this.describe(count)} by ${this.filterBy()}`;
	});

	protected readonly accessibleName = computed(
		() =>
			this.ariaLabel() ?? `Filter ${this.plural()} by ${this.filterBy()}`
	);

	protected readonly matches = computed(() => {
		const count = this.knownCount();
		return count === null ? "" : this.describe(count);
	});

	private describe(count: number) {
		const noun = count === 1 ? this.noun() : this.plural();
		return `${countFormat.format(count)} ${noun}`;
	}
}
