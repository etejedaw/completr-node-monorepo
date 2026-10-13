import {
	computed,
	DestroyRef,
	Directive,
	ElementRef,
	inject,
	input,
	output,
	signal
} from "@angular/core";

export type SwipeDirection = "left" | "right";

const AXIS_LOCK_DISTANCE = 10;
const HINT_DISTANCE = 24;
const MAX_TRAVEL = 140;
const RELEASE_TRANSITION = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";

@Directive({
	selector: "[appSwipeActions]",
	exportAs: "swipeActions",
	host: {
		"[style.transform]": "transform()",
		"[style.transition]": "transition()",
		"[style.touchAction]": "swipeDisabled() ? null : 'pan-y'",
		"(pointerdown)": "onPointerDown($event)",
		"(pointermove)": "onPointerMove($event)",
		"(pointerup)": "onPointerEnd($event)",
		"(pointercancel)": "reset()"
	}
})
export class SwipeActions {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	readonly swipeDisabled = input(false);
	readonly swipeThreshold = input(88);
	readonly swipeLeft = output<void>();
	readonly swipeRight = output<void>();

	private readonly offset = signal(0);
	private readonly dragging = signal(false);
	private startX = 0;
	private startY = 0;
	private axis: "x" | "y" | null = null;
	private suppressNextClick = false;

	readonly direction = computed<SwipeDirection | null>(() => {
		const offset = this.offset();
		if (offset > HINT_DISTANCE) return "right";
		if (offset < -HINT_DISTANCE) return "left";
		return null;
	});

	readonly armed = computed(
		() => Math.abs(this.offset()) >= this.swipeThreshold()
	);

	protected readonly transform = computed(() =>
		this.offset() === 0 ? null : `translateX(${this.offset()}px)`
	);

	protected readonly transition = computed(() =>
		this.dragging() ? "none" : RELEASE_TRANSITION
	);

	constructor() {
		const element = this.host.nativeElement;
		const blockClickAfterSwipe = (event: Event) => {
			if (!this.suppressNextClick) return;
			this.suppressNextClick = false;
			event.stopPropagation();
			event.preventDefault();
		};
		element.addEventListener("click", blockClickAfterSwipe, true);
		inject(DestroyRef).onDestroy(() =>
			element.removeEventListener("click", blockClickAfterSwipe, true)
		);
	}

	protected onPointerDown(event: PointerEvent) {
		this.suppressNextClick = false;
		if (this.swipeDisabled() || event.pointerType !== "touch") return;
		this.startX = event.clientX;
		this.startY = event.clientY;
		this.axis = null;
		this.dragging.set(true);
	}

	protected onPointerMove(event: PointerEvent) {
		if (!this.dragging()) return;
		const deltaX = event.clientX - this.startX;
		const deltaY = event.clientY - this.startY;
		if (this.axis === null) {
			if (Math.abs(deltaY) > AXIS_LOCK_DISTANCE) {
				this.reset();
				return;
			}
			if (Math.abs(deltaX) <= AXIS_LOCK_DISTANCE) return;
			this.axis = "x";
			this.host.nativeElement.setPointerCapture(event.pointerId);
		}
		this.offset.set(Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, deltaX)));
	}

	protected onPointerEnd(event: PointerEvent) {
		if (!this.dragging()) return;
		if (this.axis === "x") {
			this.suppressNextClick = true;
			if (this.armed()) {
				navigator.vibrate?.(12);
				if (this.offset() > 0) this.swipeRight.emit();
				else this.swipeLeft.emit();
			}
			this.host.nativeElement.releasePointerCapture(event.pointerId);
		}
		this.reset();
	}

	protected reset() {
		this.dragging.set(false);
		this.axis = null;
		this.offset.set(0);
	}
}
