import { ChangeDetectionStrategy, Component, output } from "@angular/core";

import { UiFocusTrap } from "../../shared/ui/focus-trap/ui-focus-trap";
import { injectBodyPortal } from "../../shared/ui/portal/body-portal";
import { GlobalSearch } from "../global-search/global-search";

@Component({
	selector: "app-mobile-search-overlay",
	imports: [GlobalSearch, UiFocusTrap],
	template: `
		<div uiFocusTrap class="h-full" (escape)="close()">
			<app-global-search
				class="h-full"
				variant="overlay"
				(closed)="close()"
			/>
		</div>
	`,
	host: {
		class: "md:hidden fixed inset-0 z-[1000] bg-canvas/97 backdrop-blur-xl pt-[env(safe-area-inset-top)] motion-safe:animate-[uiFadeUp_180ms_ease-out]",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Search"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileSearchOverlay {
	readonly closed = output<void>();

	private isClosing = false;

	constructor() {
		injectBodyPortal({ restoreFocus: true });
	}

	protected close() {
		if (this.isClosing) return;
		this.isClosing = true;
		this.closed.emit();
	}
}
