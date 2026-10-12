import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiFocusTrap } from "../focus-trap/ui-focus-trap";

@Component({
	selector: "ui-bottom-sheet",
	imports: [UiFocusTrap],
	template: `
		<button
			type="button"
			class="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm cursor-default border-0 motion-safe:animate-[uiSheetFade_200ms_ease-out]"
			[attr.aria-label]="'Close ' + heading()"
			(click)="closed.emit()"
		></button>
		<section
			uiFocusTrap
			role="dialog"
			aria-modal="true"
			[attr.aria-label]="heading()"
			class="fixed inset-x-0 bottom-0 z-[1001] max-h-[85dvh] flex flex-col rounded-t-2xl bg-sidebar border-t border-line shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom)] motion-safe:animate-[uiSheetUp_280ms_cubic-bezier(0.16,1,0.3,1)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[28rem] sm:bottom-6 sm:rounded-2xl sm:border"
			(escape)="closed.emit()"
		>
			<div
				aria-hidden="true"
				class="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-fg-muted/40"
			></div>
			<header class="flex items-center gap-3 px-5 pt-3 pb-2">
				<div class="flex-1 min-w-0">
					<h2
						class="m-0 font-display text-lg font-semibold text-fg truncate"
					>
						{{ heading() }}
					</h2>
					@if (subheading()) {
						<p class="m-0 mt-0.5 text-xs text-fg-muted truncate">
							{{ subheading() }}
						</p>
					}
				</div>
				<button
					type="button"
					class="w-11 h-11 -mr-2 rounded-full bg-transparent border-0 text-fg-muted cursor-pointer inline-flex items-center justify-center transition hover:text-fg hover:bg-surface"
					aria-label="Close"
					(click)="closed.emit()"
				>
					<span aria-hidden="true" class="material-icons">close</span>
				</button>
			</header>
			<div class="overflow-y-auto px-3 pb-4">
				<ng-content />
			</div>
		</section>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiBottomSheet {
	readonly heading = input.required<string>();
	readonly subheading = input<string | null>(null);
	readonly closed = output<void>();
}
