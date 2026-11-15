import { computed, inject, signal } from "@angular/core";

import { ViewportService } from "../../../core/services/viewport";
import { type CalendarOpeningOptions } from "./calendar-opening.model";

export function injectCalendarOpening(options: CalendarOpeningOptions) {
	const isMobile = inject(ViewportService).isMobile;
	const sheetOpen = signal(false);
	const popoverOpen = signal(false);

	function openSheet() {
		if (options.isDisabled()) return;
		options.prepare();
		if (isMobile()) sheetOpen.set(true);
	}

	function changePopover(open: boolean) {
		popoverOpen.set(open);
		if (!open) options.closed();
	}

	function closeSheet() {
		if (!sheetOpen()) return;
		sheetOpen.set(false);
		options.closed();
	}

	return {
		isMobile,
		sheetOpen: sheetOpen.asReadonly(),
		isOpen: computed(() => sheetOpen() || popoverOpen()),
		openSheet,
		changePopover,
		closeSheet
	};
}
