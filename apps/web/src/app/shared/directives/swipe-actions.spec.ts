import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { SwipeActions } from "./swipe-actions";

@Component({
	imports: [SwipeActions],
	template: `<div
		appSwipeActions
		#swipe="swipeActions"
		[swipeDisabled]="disabled"
		[swipeThreshold]="threshold"
		(swipeLeft)="events.push('left')"
		(swipeRight)="events.push('right')"
	>
		{{ swipe.direction() }}|{{ swipe.armed() }}
	</div>`
})
class Host {
	disabled = false;
	threshold = 88;
	events: string[] = [];
	clicks = 0;
}

function pointer(type: string, init: { x: number; y: number; kind?: string }) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, {
		clientX: init.x,
		clientY: init.y,
		pointerId: 1,
		pointerType: init.kind ?? "touch"
	});
	return event;
}

describe("SwipeActions", () => {
	let vibrate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vibrate = vi.fn();
		Object.defineProperty(navigator, "vibrate", {
			value: vibrate,
			configurable: true
		});
	});

	function render(state: Partial<Host> = {}) {
		const fixture = TestBed.createComponent(Host);
		Object.assign(fixture.componentInstance, state);
		fixture.detectChanges();
		const element = (fixture.nativeElement as HTMLElement).querySelector(
			"div"
		) as HTMLElement;
		element.addEventListener(
			"click",
			() => fixture.componentInstance.clicks++
		);
		element.setPointerCapture = vi.fn();
		element.releasePointerCapture = vi.fn();
		return { fixture, element, host: fixture.componentInstance };
	}

	function fire(
		ctx: ReturnType<typeof render>,
		type: string,
		x: number,
		y = 0,
		kind?: string
	) {
		ctx.element.dispatchEvent(pointer(type, { x, y, kind }));
		ctx.fixture.detectChanges();
	}

	it("allows vertical panning only when enabled", () => {
		expect(render().element.style.touchAction).toBe("pan-y");
		expect(render({ disabled: true }).element.style.touchAction).toBe("");
	});

	it("follows the finger horizontally and reports the direction", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 100);
		fire(ctx, "pointermove", 140);

		expect(ctx.element.style.transform).toBe("translateX(40px)");
		expect(ctx.element.style.transition).toBe("none");
		expect(ctx.element.textContent).toContain("right|false");
		expect(ctx.element.setPointerCapture).toHaveBeenCalledOnce();
	});

	it("does not report a direction below the hint distance", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 100);
		fire(ctx, "pointermove", 115);

		expect(ctx.element.textContent?.trim()).toBe("|false");
	});

	it("limits the travel to 140px", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 300);
		fire(ctx, "pointermove", 0);

		expect(ctx.element.style.transform).toBe("translateX(-140px)");
		expect(ctx.element.textContent).toContain("left|true");
	});

	it("emits swipeRight and vibrates when released past the threshold", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 100);
		fire(ctx, "pointerup", 100);

		expect(ctx.host.events).toEqual(["right"]);
		expect(vibrate).toHaveBeenCalledWith(12);
		expect(ctx.element.style.transform).toBe("");
		expect(ctx.element.style.transition).toContain("220ms");
	});

	it("emits swipeLeft when swiped to the left", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 200);
		fire(ctx, "pointermove", 100);
		fire(ctx, "pointerup", 100);

		expect(ctx.host.events).toEqual(["left"]);
	});

	it("honors a custom threshold", () => {
		const ctx = render({ threshold: 30 });

		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 40);
		fire(ctx, "pointerup", 40);

		expect(ctx.host.events).toEqual(["right"]);
	});

	it("emits nothing when released before the threshold", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 50);
		fire(ctx, "pointerup", 50);

		expect(ctx.host.events).toEqual([]);
		expect(vibrate).not.toHaveBeenCalled();
		expect(ctx.element.style.transform).toBe("");
	});

	it("gives up when the gesture starts vertically", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 0, 0);
		fire(ctx, "pointermove", 5, 30);
		fire(ctx, "pointermove", 120, 30);
		fire(ctx, "pointerup", 120, 30);

		expect(ctx.element.style.transform).toBe("");
		expect(ctx.host.events).toEqual([]);
		expect(ctx.element.setPointerCapture).not.toHaveBeenCalled();
	});

	it("ignores mouse pointers", () => {
		const ctx = render();

		fire(ctx, "pointerdown", 0, 0, "mouse");
		fire(ctx, "pointermove", 120, 0, "mouse");
		fire(ctx, "pointerup", 120, 0, "mouse");

		expect(ctx.host.events).toEqual([]);
		expect(ctx.element.style.transform).toBe("");
	});

	it("ignores gestures while disabled", () => {
		const ctx = render({ disabled: true });

		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 120);
		fire(ctx, "pointerup", 120);

		expect(ctx.host.events).toEqual([]);
	});

	it("resets on pointercancel", () => {
		const ctx = render();
		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 100);

		fire(ctx, "pointercancel", 100);

		expect(ctx.element.style.transform).toBe("");
		expect(ctx.host.events).toEqual([]);
	});

	it("swallows the click that follows a swipe once", () => {
		const ctx = render();
		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointermove", 100);
		fire(ctx, "pointerup", 100);

		ctx.element.click();
		ctx.element.click();

		expect(ctx.host.clicks).toBe(1);
	});

	it("does not swallow clicks after a plain tap", () => {
		const ctx = render();
		fire(ctx, "pointerdown", 0);
		fire(ctx, "pointerup", 0);

		ctx.element.click();

		expect(ctx.host.clicks).toBe(1);
	});
});
