import { Directive, output } from "@angular/core";
import { NgpFocusTrap } from "ng-primitives/focus-trap";

@Directive({
	selector: "[uiFocusTrap]",
	hostDirectives: [
		{ directive: NgpFocusTrap, inputs: ["ngpFocusTrapDisabled: disabled"] }
	],
	host: {
		"(keydown.escape)": "onEscape($event)"
	}
})
export class UiFocusTrap {
	escape = output<KeyboardEvent>();

	protected onEscape(event: Event) {
		this.escape.emit(event as KeyboardEvent);
	}
}
