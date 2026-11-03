import { type Signal } from "@angular/core";

export interface PageSearchScopeEntry {
	readonly label: Signal<string>;
	readonly placeholder: Signal<string>;
	readonly ariaLabel: Signal<string>;
	readonly value: Signal<string>;
	setValue(value: string): void;
}
