import { type Signal } from "@angular/core";

import { type UiPickerOption } from "../ui";

export interface MyTagFilterOptions {
	changed: () => void;
}

export interface MyTagFilterState {
	readonly options: Signal<UiPickerOption[]>;
	readonly selected: Signal<readonly string[]>;
	readonly active: Signal<boolean>;
	readonly param: Signal<string | undefined>;
	select: (tags: readonly string[]) => void;
	clearSilently: () => void;
}
