import { Directive, output } from "@angular/core";
import { NgpFocusTrap } from "ng-primitives/focus-trap";

/**
 * Trap focus inside the host element (autofocuses first focusable on attach
 * and cycles Tab/Shift+Tab within the host). Emits `(escape)` when the user
 * presses Escape while focus is inside — consumer should close the modal.
 *
 *   <div uiFocusTrap (escape)="onClose()" role="dialog" aria-modal="true">…</div>
 */
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
