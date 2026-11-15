import { afterNextRender, Directive, ElementRef, inject } from "@angular/core";

@Directive({ selector: "[uiDatePickerInitialFocus]" })
export class UiDatePickerInitialFocus {
	constructor() {
		const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
		afterNextRender({
			read: () =>
				host
					.querySelector<HTMLElement>('[data-day][tabindex="0"]')
					?.focus()
		});
	}
}
