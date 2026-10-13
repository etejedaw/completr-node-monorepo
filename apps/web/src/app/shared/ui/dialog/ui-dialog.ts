import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal
} from "@angular/core";

import { ViewportService } from "../../../core/services/viewport";
import { UiFocusTrap } from "../focus-trap/ui-focus-trap";
import { injectBodyPortal } from "../portal/body-portal";

export type UiDialogSize = "sm" | "md" | "lg" | "xl";

const DIALOG_WIDTH: Record<UiDialogSize, string> = {
	sm: "md:w-[440px]",
	md: "md:w-[560px]",
	lg: "md:w-[720px]",
	xl: "md:w-[920px]"
};

const SWIPE_DISMISS_DISTANCE = 96;
const SWIPE_DISMISS_VELOCITY = 0.6;

let nextDialogId = 0;

@Component({
	selector: "ui-dialog",
	imports: [UiFocusTrap],
	template: `
		<div
			class="fixed inset-0 z-[1000] flex items-end justify-center md:items-center md:p-6"
		>
			<div
				aria-hidden="true"
				class="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-[uiSheetFade_200ms_ease-out]"
				[style.opacity]="backdropOpacity()"
				(pointerdown)="backdropPressed = true"
				(click)="onBackdropClick()"
			></div>
			<section
				uiFocusTrap
				role="dialog"
				aria-modal="true"
				[attr.aria-labelledby]="titleId"
				[attr.aria-describedby]="subheading() ? subtitleId : null"
				class="relative flex flex-col w-full max-h-[92dvh] outline-none bg-sidebar border-t border-line rounded-t-2xl shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom)] motion-safe:max-md:animate-[uiSheetUp_280ms_cubic-bezier(0.16,1,0.3,1)] md:max-h-[min(88dvh,60rem)] md:pb-0 md:border md:rounded-2xl md:shadow-[0_24px_70px_-16px_rgba(0,0,0,0.75)] motion-safe:md:animate-[uiDialogIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
				[class]="widthClass()"
				[class.transition-transform]="!dragging()"
				[class.duration-200]="!dragging()"
				[style.transform]="dragTransform()"
				(escape)="onEscape($event)"
			>
				<div
					class="shrink-0 max-md:touch-none"
					(pointerdown)="onDragStart($event)"
					(pointermove)="onDragMove($event)"
					(pointerup)="onDragEnd($event)"
					(pointercancel)="onDragCancel()"
				>
					<div
						aria-hidden="true"
						class="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-fg-muted/40"
					></div>
					<header
						class="flex items-start gap-3 px-5 pt-3 pb-3 md:px-6 md:pt-5 md:pb-4"
					>
						<ng-content select="[dialogLead]" />
						<div class="flex-1 min-w-0">
							@if (eyebrow()) {
								<span
									class="block text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
									>{{ eyebrow() }}</span
								>
							}
							<h2
								class="m-0 font-display text-lg md:text-xl font-bold tracking-tight leading-tight text-fg text-balance break-words"
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
							class="shrink-0 -mr-2 -mt-1 size-[36px] max-md:size-[44px] pointer-coarse:size-[44px] rounded-full bg-transparent border-0 text-fg-muted cursor-pointer inline-flex items-center justify-center transition hover:text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
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
				</div>
				<div
					class="flex-1 min-h-0 overflow-y-auto overscroll-contain"
					[class.px-5]="!flush()"
					[class.md:px-6]="!flush()"
					[class.pb-5]="!flush()"
					[class.md:pb-6]="!flush()"
				>
					<ng-content />
				</div>
				<div
					class="empty:hidden shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-3 md:px-6 md:py-4 border-t border-line max-md:[&>*]:flex-1 max-md:[&>.ui-button]:min-h-[44px]"
				>
					<ng-content select="[dialogFooter]" />
				</div>
			</section>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDialog {
	readonly heading = input.required<string>();
	readonly subheading = input<string | null>(null);
	readonly eyebrow = input<string | null>(null);
	readonly size = input<UiDialogSize>("md");
	readonly dismissible = input(true);
	readonly flush = input(false);
	readonly closed = output<void>();

	private readonly viewport = inject(ViewportService);
	private readonly dragOffset = signal(0);
	private dragStart: { y: number; time: number; pointerId: number } | null =
		null;

	protected readonly titleId = `ui-dialog-title-${nextDialogId}`;
	protected readonly subtitleId = `ui-dialog-subtitle-${nextDialogId++}`;
	protected readonly dragging = signal(false);
	protected readonly widthClass = computed(() => DIALOG_WIDTH[this.size()]);
	protected readonly dragTransform = computed(() =>
		this.dragOffset() ? `translateY(${this.dragOffset()}px)` : null
	);
	protected readonly backdropOpacity = computed(() =>
		this.dragOffset()
			? Math.max(0.2, 1 - this.dragOffset() / 400).toString()
			: null
	);
	protected backdropPressed = false;

	constructor() {
		injectBodyPortal({ restoreFocus: true });
	}

	protected onBackdropClick() {
		const pressedOnBackdrop = this.backdropPressed;
		this.backdropPressed = false;
		if (pressedOnBackdrop) this.dismiss();
	}

	protected onEscape(event: KeyboardEvent) {
		event.stopPropagation();
		this.dismiss();
	}

	protected onDragStart(event: PointerEvent) {
		if (!this.viewport.isMobile() || !this.dismissible()) return;
		if ((event.target as Element).closest("button, a, input")) return;
		this.dragStart = {
			y: event.clientY,
			time: event.timeStamp,
			pointerId: event.pointerId
		};
		(event.currentTarget as Element).setPointerCapture(event.pointerId);
		this.dragging.set(true);
	}

	protected onDragMove(event: PointerEvent) {
		if (this.dragStart?.pointerId !== event.pointerId) return;
		this.dragOffset.set(Math.max(0, event.clientY - this.dragStart.y));
	}

	protected onDragEnd(event: PointerEvent) {
		const start = this.dragStart;
		if (start?.pointerId !== event.pointerId) return;
		const distance = Math.max(0, event.clientY - start.y);
		const velocity = distance / Math.max(1, event.timeStamp - start.time);
		this.onDragCancel();
		if (
			distance > SWIPE_DISMISS_DISTANCE ||
			(distance > 24 && velocity > SWIPE_DISMISS_VELOCITY)
		)
			this.closed.emit();
	}

	protected onDragCancel() {
		this.dragStart = null;
		this.dragging.set(false);
		this.dragOffset.set(0);
	}

	private dismiss() {
		if (this.dismissible()) this.closed.emit();
	}
}
