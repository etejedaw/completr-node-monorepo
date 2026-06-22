import { Directive } from "@angular/core";
import { NgpSeparator } from "ng-primitives/separator";

/**
 * Wrapper that adds `role="separator"` + `aria-orientation` over an existing
 * styled element. Apply on top of your own Tailwind classes (e.g. `h-px bg-line`).
 */
@Directive({
	selector: "[uiSeparator]",
	hostDirectives: [
		{ directive: NgpSeparator, inputs: ["ngpSeparatorOrientation: orientation"] }
	]
})
export class UiSeparator {}
