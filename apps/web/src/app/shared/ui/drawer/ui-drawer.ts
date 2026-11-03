import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { UiFocusTrap } from "../focus-trap/ui-focus-trap";
import { UiIconButton } from "../icon-button/ui-icon-button";
import { injectBodyPortal } from "../portal/body-portal";
import {
	UI_TONE_COLOR,
	UI_TONE_HALO_CLASS,
	UI_TONE_ICON_CLASS,
	type UiTone
} from "../tone/ui-tone";

let nextDrawerId = 0;

@Component({
	selector: "ui-drawer",
	imports: [UiFocusTrap, UiIconButton],
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
					class="shrink-0 flex items-start gap-3.5 px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-5 border-b border-line"
					[class]="haloClass"
					[style.--ui-tone]="toneColor()"
				>
					@if (icon()) {
						<span
							aria-hidden="true"
							class="shrink-0 inline-flex size-12 items-center justify-center rounded-xl ring-1 ring-inset shadow-[0_8px_24px_-10px_currentColor]"
							[class]="iconToneClass()"
						>
							<span class="material-icons text-[22px]">{{
								icon()
							}}</span>
						</span>
					}
					<div class="flex-1 min-w-0">
						@if (eyebrow()) {
							<span
								class="block text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
								>{{ eyebrow() }}</span
							>
						}
						<h2
							class="m-0 font-display text-xl md:text-2xl font-bold tracking-tight leading-tight text-fg text-balance break-words"
							[id]="titleId"
						>
							{{ heading() }}
						</h2>
						@if (subheading()) {
							<p
								class="m-0 mt-1.5 text-sm text-fg-muted text-pretty"
								[id]="subtitleId"
							>
								{{ subheading() }}
							</p>
						}
					</div>
					<button
						uiIconButton
						size="lg"
						shape="circle"
						type="button"
						class="shrink-0 -mr-2 -mt-1"
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
					class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 md:px-6"
				>
					<ng-content />
				</div>
				<div
					class="empty:hidden shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-6 md:py-4 border-t border-line bg-surface/40"
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
	readonly icon = input<string | null>(null);
	readonly tone = input<UiTone>("brand");
	readonly closed = output<void>();

	protected readonly titleId = `ui-drawer-title-${nextDrawerId}`;
	protected readonly subtitleId = `ui-drawer-subtitle-${nextDrawerId++}`;
	protected readonly haloClass = UI_TONE_HALO_CLASS;
	protected readonly iconToneClass = computed(
		() => UI_TONE_ICON_CLASS[this.tone()]
	);
	protected readonly toneColor = computed(() => UI_TONE_COLOR[this.tone()]);

	constructor() {
		injectBodyPortal({ restoreFocus: true });
	}

	protected onEscape(event: KeyboardEvent) {
		event.stopPropagation();
		this.closed.emit();
	}
}
