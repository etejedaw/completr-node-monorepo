import { Directive } from "@angular/core";

@Directive({
	selector: "[uiEyebrow]",
	host: {
		class: "block text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-fg-muted"
	}
})
export class UiEyebrow {}
