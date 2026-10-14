import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiFocusTrap } from "../focus-trap/ui-focus-trap";
import { injectBodyPortal } from "../portal/body-portal";

let nextDrawerId = 0;

@Component({
	selector: "ui-drawer",
	imports: [UiFocusTrap],
	template: `
		<div class="fixed inset-0 z-[1000] flex justify-end">
			<div
				aria-hidden="true"
				class="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-[uiSheetFade_200ms_ease-out]"
				(click)="closed.emit()"
			></div>
			<section
				uiFocusTrap
				role="dialog"
				aria-modal="true"
				[attr.aria-labelledby]="titleId"
				[attr.aria-describedby]="subheading() ? subtitleId : null"
				class="relative flex flex-col w-full sm:w-[420px] h-dvh outline-none bg-sidebar border-l border-line shadow-[0_0_60px_-12px_rgba(0,0,0,0.7)] pb-[env(safe-area-inset-bottom)] motion-safe:animate-[uiDrawerIn_260ms_cubic-bezier(0.16,1,0.3,1)]"
				(escape)="onEscape($event)"
			>
				<header
					class="shrink-0 flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line"
				>
					<div class="flex-1 min-w-0">
						@if (eyebrow()) {
							<span
								class="block text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
								>{{ eyebrow() }}</span
							>
						}
						<h2
							class="m-0 font-display text-xl font-bold tracking-tight leading-tight text-fg text-balance"
							[id]="titleId"
						>
							{{ heading() }}
						</h2>
						@if (subheading()) {
							<p
								class="m-0 mt-1 text-[0.8125rem] text-fg-muted text-pretty"
								[id]="subtitleId"
							>
								{{ subheading() }}
							</p>
						}
					</div>
					<button
						type="button"
						class="shrink-0 -mr-2 -mt-1 size-[36px] tap:size-[44px] rounded-full bg-transparent border-0 text-fg-muted cursor-pointer inline-flex items-center justify-center transition hover:text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
						[attr.aria-label]="'Close ' + heading()"
						(click)="closed.emit()"
					>
						<span
							aria-hidden="true"
							class="material-icons text-[20px]"
							>close</span
						>
					</button>
				</header>
				<div
					class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5"
				>
					<ng-content />
				</div>
				<div
					class="empty:hidden shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-line"
				>
					<ng-content select="[drawerFooter]" />
				</div>
			</section>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDrawer {
	readonly heading = input.required<string>();
	readonly subheading = input<string | null>(null);
	readonly eyebrow = input<string | null>(null);
	readonly closed = output<void>();

	protected readonly titleId = `ui-drawer-title-${nextDrawerId}`;
	protected readonly subtitleId = `ui-drawer-subtitle-${nextDrawerId++}`;

	constructor() {
		injectBodyPortal({ restoreFocus: true });
	}

	protected onEscape(event: KeyboardEvent) {
		event.stopPropagation();
		this.closed.emit();
	}
}
