import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiSearchBar } from "../../ui";
import { type UiSearchBarSize } from "../../ui/search-bar/ui-search-bar";

@Component({
	selector: "app-page-search",
	imports: [UiSearchBar],
	template: `
		<ui-search-bar
			[size]="size()"
			[placeholder]="placeholder()"
			[ariaLabel]="ariaLabel()"
			[value]="value()"
			(valueChange)="valueChange.emit($event)"
		/>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageSearch {
	readonly scopeLabel = input.required<string>();
	readonly placeholder = input("Search...");
	readonly ariaLabel = input<string | null>(null);
	readonly size = input<UiSearchBarSize>("md");
	readonly value = input("");

	readonly valueChange = output<string>();
}
