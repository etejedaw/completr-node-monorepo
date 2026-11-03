import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	linkedSignal,
	output
} from "@angular/core";

import { PageSearchScope } from "../../../core/services/page-search-scope";
import { UiSearchBar } from "../../ui";
import { type UiSearchBarSize } from "../../ui/search-bar/ui-search-bar";

@Component({
	selector: "app-page-search",
	imports: [UiSearchBar],
	template: `
		@if (!registered) {
			<ui-search-bar
				[size]="size()"
				[placeholder]="placeholder()"
				[ariaLabel]="ariaLabel()"
				[value]="value()"
				(valueChange)="valueChange.emit($event)"
			/>
		}
	`,
	host: {
		"[class.block]": "!registered",
		"[class.hidden]": "registered"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageSearch {
	private readonly scope = inject(PageSearchScope, { optional: true });

	readonly scopeLabel = input.required<string>();
	readonly placeholder = input("Search...");
	readonly ariaLabel = input<string | null>(null);
	readonly size = input<UiSearchBarSize>("md");
	readonly value = input("");

	readonly valueChange = output<string>();

	private readonly currentValue = linkedSignal(() => this.value());
	protected readonly registered = this.scope !== null;

	constructor() {
		if (!this.scope) return;
		const unregister = this.scope.register({
			label: this.scopeLabel,
			placeholder: this.placeholder,
			ariaLabel: computed(() => `Filter ${this.scopeLabel()}`),
			value: this.currentValue.asReadonly(),
			setValue: value => this.updateValue(value)
		});
		inject(DestroyRef).onDestroy(unregister);
	}

	private updateValue(value: string) {
		if (value === this.currentValue()) return;
		this.currentValue.set(value);
		this.valueChange.emit(value);
	}
}
