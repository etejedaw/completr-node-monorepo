import {
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	inject
} from "@angular/core";

import { MAIN_CONTENT_ID } from "../page-scroller/page-scroller";

function isPlainClick(event: MouseEvent): boolean {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}

@Component({
	selector: "app-skip-link",
	template: `
		<a
			[href]="href"
			class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-4 focus:rounded-card focus:bg-brand-solid focus:text-white focus:font-semibold focus:no-underline focus:outline-2 focus:outline-offset-2 focus:outline-brand"
			(click)="focusMainContent($event)"
			>Skip to content</a
		>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkipLink {
	private readonly document = inject(DOCUMENT);
	protected readonly href = `#${MAIN_CONTENT_ID}`;

	protected focusMainContent(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		const mainContent = this.document.getElementById(MAIN_CONTENT_ID);
		if (!mainContent) return;
		event.preventDefault();
		mainContent.focus();
	}
}
