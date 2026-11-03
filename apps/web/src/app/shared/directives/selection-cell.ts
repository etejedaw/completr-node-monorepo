import { Directive, output } from "@angular/core";

import { type SelectionToggle } from "./selection-cell.model";

@Directive({
	selector: "td[appSelectionCell], th[appSelectionCell]",
	host: {
		class: "w-11 min-w-[44px] !px-0 !text-center cursor-pointer select-none",
		"(mousedown)": "preventTextSelection($event)",
		"(click)": "toggleFromPointer($event)",
		"(keydown)": "toggleFromKeyboard($event)"
	}
})
export class SelectionCell {
	readonly selectionToggled = output<SelectionToggle>();

	protected preventTextSelection(event: MouseEvent) {
		if (event.shiftKey) event.preventDefault();
	}

	protected toggleFromPointer(event: MouseEvent) {
		event.stopPropagation();
		this.selectionToggled.emit({ range: event.shiftKey });
	}

	protected toggleFromKeyboard(event: KeyboardEvent) {
		if (event.key !== " ") return;
		event.stopPropagation();
		this.selectionToggled.emit({ range: event.shiftKey });
	}
}
