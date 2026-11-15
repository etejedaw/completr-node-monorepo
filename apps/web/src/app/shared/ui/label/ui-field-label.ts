import { Directive } from "@angular/core";

@Directive({
	selector: "[uiFieldLabel]",
	host: {
		class: "flex items-baseline gap-2 mb-1.5 text-compact font-medium text-fg-secondary"
	}
})
export class UiFieldLabel {}
