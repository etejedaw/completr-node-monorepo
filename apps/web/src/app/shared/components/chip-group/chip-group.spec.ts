import { TestBed } from "@angular/core/testing";

import { ChipGroup } from "./chip-group";
import { type ChipOption } from "./chip-group.model";

const options: ChipOption[] = [
	{ value: "a", label: "Alpha", count: 3 },
	{ value: "b", label: "Beta", icon: "star", hint: "Second" },
	{ value: "c", label: "Gamma", count: 0 }
];

describe("ChipGroup", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(ChipGroup);
		fixture.componentRef.setInput("options", options);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function chip(fixture: { nativeElement: unknown }, value: string) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			`[data-chip-value="${value}"]`
		) as HTMLButtonElement;
	}

	function arrow(fixture: { nativeElement: unknown }, key: string, on = "a") {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true
		});
		chip(fixture, on).dispatchEvent(event);
		return event;
	}

	beforeEach(() => {
		vi.stubGlobal("CSS", { escape: (value: string) => value });
		TestBed.configureTestingModule({ imports: [ChipGroup] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("multiple mode", () => {
		it("renders a labelled group of toggle buttons", () => {
			const fixture = render({ label: "Genres" });
			const group = (fixture.nativeElement as HTMLElement).querySelector(
				"[role='group']"
			)!;

			expect(group.getAttribute("aria-label")).toBe("Genres");
			expect(chip(fixture, "a").getAttribute("aria-pressed")).toBe(
				"false"
			);
			expect(chip(fixture, "a").hasAttribute("role")).toBe(false);
		});

		it("renders counts including zero, icons and hints", () => {
			const fixture = render();

			expect(chip(fixture, "a").textContent).toContain("3");
			expect(chip(fixture, "c").textContent).toContain("0");
			expect(chip(fixture, "b").textContent).toContain("star");
			expect(chip(fixture, "b").getAttribute("title")).toBe("Second");
			expect(chip(fixture, "b").textContent).not.toMatch(/\d/);
		});

		it("adds and removes values as chips are toggled", () => {
			const fixture = render();

			chip(fixture, "a").click();
			chip(fixture, "c").click();
			expect(fixture.componentInstance.value()).toEqual(["a", "c"]);

			chip(fixture, "a").click();
			expect(fixture.componentInstance.value()).toEqual(["c"]);
		});

		it("reflects the selected values as pressed", () => {
			const fixture = render({ value: ["b"] });

			expect(chip(fixture, "b").getAttribute("aria-pressed")).toBe(
				"true"
			);
			expect(chip(fixture, "a").getAttribute("aria-pressed")).toBe(
				"false"
			);
		});

		it("is not part of the tab order and ignores arrow keys", () => {
			const fixture = render();

			const event = arrow(fixture, "ArrowRight");

			expect(chip(fixture, "a").hasAttribute("tabindex")).toBe(false);
			expect(event.defaultPrevented).toBe(false);
			expect(fixture.componentInstance.value()).toEqual([]);
		});
	});

	describe("single mode", () => {
		it("renders a radio group with aria-checked", () => {
			const fixture = render({ mode: "single", value: ["b"] });
			const group = (fixture.nativeElement as HTMLElement).querySelector(
				"[role='radiogroup']"
			);

			expect(group).not.toBeNull();
			expect(chip(fixture, "b").getAttribute("role")).toBe("radio");
			expect(chip(fixture, "b").getAttribute("aria-checked")).toBe(
				"true"
			);
			expect(chip(fixture, "a").getAttribute("aria-checked")).toBe(
				"false"
			);
		});

		it("replaces the selection when another chip is clicked", () => {
			const fixture = render({ mode: "single", value: ["a"] });

			chip(fixture, "b").click();

			expect(fixture.componentInstance.value()).toEqual(["b"]);
		});

		it("clears the selection when clicking the current chip and empty is allowed", () => {
			const fixture = render({ mode: "single", value: ["a"] });

			chip(fixture, "a").click();

			expect(fixture.componentInstance.value()).toEqual([]);
		});

		it("keeps the selection when clicking the current chip and empty is not allowed", () => {
			const fixture = render({
				mode: "single",
				value: ["a"],
				allowEmpty: false
			});

			chip(fixture, "a").click();

			expect(fixture.componentInstance.value()).toEqual(["a"]);
		});

		it("puts only the selected chip in the tab order", () => {
			const fixture = render({ mode: "single", value: ["b"] });

			expect(chip(fixture, "b").tabIndex).toBe(0);
			expect(chip(fixture, "a").tabIndex).toBe(-1);
			expect(chip(fixture, "c").tabIndex).toBe(-1);
		});

		it("puts the first chip in the tab order when nothing is selected", () => {
			const fixture = render({ mode: "single" });

			expect(chip(fixture, "a").tabIndex).toBe(0);
			expect(chip(fixture, "b").tabIndex).toBe(-1);
		});

		it("moves the selection forward with arrow keys, wrapping around", () => {
			const fixture = render({ mode: "single", value: ["c"] });

			const event = arrow(fixture, "ArrowRight", "c");

			expect(event.defaultPrevented).toBe(true);
			expect(fixture.componentInstance.value()).toEqual(["a"]);
		});

		it("moves the selection backward with arrow keys, wrapping around", () => {
			const fixture = render({ mode: "single", value: ["a"] });

			arrow(fixture, "ArrowLeft");

			expect(fixture.componentInstance.value()).toEqual(["c"]);
		});

		it("selects the second chip on the first ArrowDown when nothing is selected", () => {
			const fixture = render({ mode: "single" });

			arrow(fixture, "ArrowDown");

			expect(fixture.componentInstance.value()).toEqual(["b"]);
		});

		it("focuses the newly selected chip", () => {
			const fixture = render({ mode: "single", value: ["a"] });
			document.body.appendChild(fixture.nativeElement);

			arrow(fixture, "ArrowRight");

			expect(document.activeElement).toBe(chip(fixture, "b"));
			fixture.nativeElement.remove();
		});

		it("ignores keys that are not arrows", () => {
			const fixture = render({ mode: "single", value: ["a"] });

			const event = arrow(fixture, "Enter");

			expect(event.defaultPrevented).toBe(false);
			expect(fixture.componentInstance.value()).toEqual(["a"]);
		});
	});
});
