import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-library-toolbar",
	template: `<ng-content />`,
	host: {
		class: "[&:not(:has(>:not(.hidden,.sr-only)))]:hidden bleed bleed-inner sticky top-[var(--topbar-height)] z-30 py-3 mb-6 flex flex-wrap items-center gap-2 bg-canvas/85 backdrop-blur-md border-b border-line/60"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibraryToolbar {}
