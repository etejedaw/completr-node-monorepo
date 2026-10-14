import { Directive } from "@angular/core";

@Directive({
	selector: "[uiFieldLabel]",
	host: {
		class: "block mb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-fg-muted"
	}
})
export class UiFieldLabel {}
