import { TestBed } from "@angular/core/testing";

import { UiSearchBar } from "./ui-search-bar";

describe("UiSearchBar", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiSearchBar);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function renderedInput(inputs: Record<string, unknown> = {}) {
		return (render(inputs).nativeElement as HTMLElement).querySelector(
			"input"
		) as HTMLInputElement;
	}

	function typeInto(
		fixture: ReturnType<typeof render>,
		input: HTMLInputElement,
		text: string
	) {
		input.value = text;
		input.dispatchEvent(new Event("input"));
		fixture.detectChanges();
	}

	function clearButton(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			"button[aria-label='Clear search']"
		) as HTMLButtonElement | null;
	}

	function box(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			"div"
		) as HTMLElement;
	}

	it("names the input after the placeholder without its trailing ellipsis", () => {
		const input = renderedInput({ placeholder: "Search your library..." });

		expect(input.getAttribute("aria-label")).toBe("Search your library");
	});

	it("prefers the explicit accessible name", () => {
		const input = renderedInput({
			placeholder: "Search...",
			ariaLabel: "Search Want to Get"
		});

		expect(input.getAttribute("aria-label")).toBe("Search Want to Get");
	});

	it("renders the 44px box by default", () => {
		const fixture = render();

		expect(fixture.nativeElement.getAttribute("data-size")).toBe("md");
		expect(box(fixture).classList).toContain("min-h-[44px]");
		expect(
			fixture.nativeElement.querySelector("input").classList
		).toContain("text-sm");
	});

	it("renders the toolbar box for the sm size, growing to 44px on touch and narrow screens", () => {
		const fixture = render({ size: "sm" });

		expect(fixture.nativeElement.getAttribute("data-size")).toBe("sm");
		expect(box(fixture).classList).toContain("min-h-10");
		expect(box(fixture).classList).toContain("tap:min-h-[44px]");
		expect(box(fixture).classList).toContain("max-sm:min-h-[44px]");
		expect(
			fixture.nativeElement.querySelector("input").classList
		).toContain("text-sm");
	});

	it("renders the larger box when asked for the lg size", () => {
		const fixture = render({ size: "lg" });

		expect(fixture.nativeElement.getAttribute("data-size")).toBe("lg");
		expect(box(fixture).classList).toContain("min-h-[52px]");
		expect(box(fixture).classList).not.toContain("min-h-[44px]");
		expect(
			fixture.nativeElement.querySelector("input").classList
		).toContain("text-base");
	});

	it("swaps the box height when the size changes after rendering", () => {
		const fixture = render({ size: "lg" });

		fixture.componentRef.setInput("size", "md");
		fixture.detectChanges();

		expect(box(fixture).classList).toContain("min-h-[44px]");
		expect(box(fixture).classList).not.toContain("min-h-[52px]");
	});

	it("shows the clear button only while there is text", () => {
		const fixture = render();
		const input = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;

		expect(clearButton(fixture)).toBeNull();

		typeInto(fixture, input, "zelda");
		expect(clearButton(fixture)).not.toBeNull();

		typeInto(fixture, input, "");
		expect(clearButton(fixture)).toBeNull();
	});

	it("clears the text with the clear button", () => {
		const fixture = render();
		const input = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;
		typeInto(fixture, input, "zelda");

		clearButton(fixture)?.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("");
		expect(input.value).toBe("");
		expect(clearButton(fixture)).toBeNull();
	});

	it("clears the text with Escape and ignores Escape on an empty field", () => {
		const fixture = render();
		const input = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		fixture.detectChanges();
		expect(fixture.componentInstance.value()).toBe("");

		typeInto(fixture, input, "zelda");
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("");
		expect(input.value).toBe("");
	});

	it("keeps Escape from reaching the surrounding dialog only while it clears text", () => {
		const fixture = render();
		const input = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;
		const reachedParent = vi.fn();
		(fixture.nativeElement as HTMLElement).addEventListener(
			"keydown",
			reachedParent
		);

		typeInto(fixture, input, "zelda");
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		fixture.detectChanges();
		expect(fixture.componentInstance.value()).toBe("");
		expect(reachedParent).not.toHaveBeenCalled();

		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		expect(reachedParent).toHaveBeenCalledTimes(1);
	});

	it("keeps up with erratic typing, double clears and junk input", () => {
		const fixture = render();
		const input = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;

		typeInto(
			fixture,
			input,
			"<script>alert(1)</script> \u0000 🎮".repeat(20)
		);
		expect(fixture.componentInstance.value()).toContain("<script>");

		const button = clearButton(fixture);
		button?.click();
		button?.click();
		fixture.detectChanges();
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("");
		expect(clearButton(fixture)).toBeNull();
	});
});
