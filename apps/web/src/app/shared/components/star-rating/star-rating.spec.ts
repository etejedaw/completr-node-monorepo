import { TestBed } from "@angular/core/testing";

import { StarRating } from "./star-rating";

describe("StarRating", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(StarRating);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const emitted: (number | null)[] = [];
		fixture.componentInstance.ratingChange.subscribe(v => emitted.push(v));
		return { fixture, element, emitted };
	}

	function slider(element: HTMLElement) {
		return element.querySelector('[role="slider"]') as HTMLElement;
	}

	function halfButtons(element: HTMLElement) {
		return Array.from(
			element.querySelectorAll<HTMLButtonElement>("button")
		);
	}

	function press(element: HTMLElement, key: string) {
		const event = new KeyboardEvent("keydown", { key, cancelable: true });
		slider(element).dispatchEvent(event);
		return event;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [StarRating] });
	});

	describe("rendering", () => {
		it("exposes an interactive slider with the current value", () => {
			const { element } = render({ value: 3.5 });

			const el = slider(element);
			expect(el.getAttribute("aria-valuenow")).toBe("3.5");
			expect(el.getAttribute("aria-valuemin")).toBe("0");
			expect(el.getAttribute("aria-valuemax")).toBe("5");
			expect(el.getAttribute("aria-valuetext")).toBe(
				"3.5 out of 5 — Fun"
			);
			expect(el.getAttribute("aria-label")).toBe("Rating");
			expect(el.tabIndex).toBe(0);
		});

		it("describes an unrated slider as no rating", () => {
			const { element } = render();

			expect(slider(element).getAttribute("aria-valuetext")).toBe(
				"no rating"
			);
			expect(slider(element).getAttribute("aria-valuenow")).toBe("0");
		});

		it("uses aria-labelledby instead of the default label when provided", () => {
			const { element } = render({ ariaLabelledby: "heading" });

			expect(slider(element).getAttribute("aria-labelledby")).toBe(
				"heading"
			);
			expect(slider(element).hasAttribute("aria-label")).toBe(false);
		});

		it("renders an image without buttons or value text when readonly", () => {
			const { element } = render({ value: 4, readonly: true });

			const img = element.querySelector('[role="img"]') as HTMLElement;
			expect(img).not.toBeNull();
			expect(img.getAttribute("aria-readonly")).toBe("true");
			expect(img.getAttribute("aria-valuetext")).toBe(
				"4 out of 5 — Banger"
			);
			expect(element.querySelector("button")).toBeNull();
			expect(element.textContent).not.toContain("Banger");
		});

		it("shows the numeric value and its label next to the stars", () => {
			const { element } = render({ value: 4.5 });

			expect(element.textContent).toContain("4.5");
			expect(element.textContent).toContain("Peak");
		});

		it("hides the value text when showValue is false", () => {
			const { element } = render({ value: 4.5, showValue: false });

			expect(element.textContent).not.toContain("Peak");
		});

		it("renders five stars", () => {
			const { element } = render({ value: 2 });

			expect(element.querySelectorAll("span.inline-block")).toHaveLength(
				5
			);
		});
	});

	describe("pointer interaction", () => {
		it("emits a half step from the left half and a full step from the right half", () => {
			const { element, emitted } = render();
			const buttons = halfButtons(element);

			buttons[4].click();
			buttons[5].click();

			expect(emitted).toEqual([2.5, 3]);
		});

		it("emits null when clicking the value that is already set", () => {
			const { element, emitted } = render({ value: 3 });

			halfButtons(element)[5].click();

			expect(emitted).toEqual([null]);
		});

		it("previews the hovered value and restores it on leave", () => {
			const { fixture, element } = render({ value: 1 });

			halfButtons(element)[7].dispatchEvent(new Event("mouseenter"));
			fixture.detectChanges();
			expect(element.textContent).toContain("4");
			expect(element.textContent).toContain("Banger");

			element.firstElementChild!.dispatchEvent(new Event("mouseleave"));
			fixture.detectChanges();
			expect(element.textContent).toContain("Trash");
		});
	});

	describe("keyboard interaction", () => {
		it.each([
			["ArrowRight", 3, 3.5],
			["ArrowUp", 3, 3.5],
			["ArrowLeft", 3, 2.5],
			["ArrowDown", 3, 2.5],
			["Home", 3, 0.5],
			["End", 3, 5]
		])("%s from %s emits %s", (key, current, expected) => {
			const { element, emitted } = render({ value: current });

			const event = press(element, key);

			expect(emitted).toEqual([expected]);
			expect(event.defaultPrevented).toBe(true);
		});

		it.each(["Delete", "Backspace"])("%s clears the rating", key => {
			const { element, emitted } = render({ value: 3 });

			press(element, key);

			expect(emitted).toEqual([null]);
		});

		it("starts from zero when there is no rating yet", () => {
			const { element, emitted } = render();

			press(element, "ArrowRight");

			expect(emitted).toEqual([0.5]);
		});

		it("never goes above five", () => {
			const { element, emitted } = render({ value: 5 });

			press(element, "ArrowRight");

			expect(emitted).toEqual([5]);
		});

		it.each(["ArrowLeft", "ArrowDown"])(
			"never goes below half a star on %s",
			key => {
				const { element, emitted } = render({ value: 0.5 });

				press(element, key);

				expect(emitted).toEqual([0.5]);
			}
		);

		it("never emits zero when there is no rating yet", () => {
			const { element, emitted } = render({ value: null });

			press(element, "ArrowLeft");

			expect(emitted).toEqual([0.5]);
		});

		it("ignores other keys without preventing the default", () => {
			const { element, emitted } = render({ value: 3 });

			const event = press(element, "a");

			expect(emitted).toEqual([]);
			expect(event.defaultPrevented).toBe(false);
		});

		it("ignores every key when readonly", () => {
			const { element, emitted } = render({ value: 3, readonly: true });
			const target = element.querySelector('[role="img"]') as HTMLElement;

			target.dispatchEvent(
				new KeyboardEvent("keydown", { key: "ArrowRight" })
			);

			expect(emitted).toEqual([]);
		});
	});
});
