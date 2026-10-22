import { TestBed } from "@angular/core/testing";

import { MoodTagsInput } from "./mood-tags-input";

describe("MoodTagsInput", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(MoodTagsInput);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		const emitted: string[][] = [];
		fixture.componentInstance.tagsChange.subscribe(tags =>
			emitted.push(tags)
		);
		fixture.detectChanges();
		return { fixture, emitted };
	}

	function field(fixture: ReturnType<typeof render>["fixture"]) {
		return (fixture.nativeElement as HTMLElement).querySelector(
			"input"
		) as HTMLInputElement;
	}

	function type(
		fixture: ReturnType<typeof render>["fixture"],
		value: string
	) {
		const input = field(fixture);
		input.value = value;
		input.dispatchEvent(new Event("input"));
		fixture.detectChanges();
	}

	function press(fixture: ReturnType<typeof render>["fixture"], key: string) {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true
		});
		field(fixture).dispatchEvent(event);
		fixture.detectChanges();
		return event;
	}

	it("renders the current tags with a remove button each", () => {
		const { fixture } = render({ tags: ["cozy", "short"] });
		const root = fixture.nativeElement as HTMLElement;

		expect(root.textContent).toContain("cozy");
		expect(
			root.querySelector('[aria-label="Remove short"]')
		).not.toBeNull();
	});

	it("shows the placeholder only while there are no tags", () => {
		expect(field(render().fixture).placeholder).toBe("Add a tag…");
		expect(field(render({ tags: ["a"] }).fixture).placeholder).toBe("");
	});

	it("adds a normalized tag on Enter", () => {
		const { fixture, emitted } = render({ tags: ["cozy"] });

		type(fixture, "  Café   Time ");
		const event = press(fixture, "Enter");

		expect(event.defaultPrevented).toBe(true);
		expect(emitted).toEqual([["cozy", "cafe time"]]);
		expect(field(fixture).value).toBe("");
	});

	it("adds a tag on comma", () => {
		const { fixture, emitted } = render();

		type(fixture, "relax");
		press(fixture, ",");

		expect(emitted).toEqual([["relax"]]);
	});

	it("ignores blank, duplicated and over-long tags", () => {
		const { fixture, emitted } = render({ tags: ["cozy"] });

		type(fixture, "   ");
		press(fixture, "Enter");
		type(fixture, "COZY");
		press(fixture, "Enter");
		type(fixture, "x".repeat(41));
		press(fixture, "Enter");

		expect(emitted).toEqual([]);
	});

	it("accepts a tag of exactly 40 characters", () => {
		const { fixture, emitted } = render();

		type(fixture, "x".repeat(40));
		press(fixture, "Enter");

		expect(emitted).toEqual([["x".repeat(40)]]);
	});

	it("hides the input when the maximum is reached", () => {
		const { fixture } = render({ tags: ["a", "b"], max: 2 });

		expect(field(fixture)).toBeNull();
	});

	it("removes a tag with its button", () => {
		const { fixture, emitted } = render({ tags: ["a", "b", "c"] });

		(
			(fixture.nativeElement as HTMLElement).querySelector(
				'[aria-label="Remove b"]'
			) as HTMLButtonElement
		).click();

		expect(emitted).toEqual([["a", "c"]]);
	});

	it("removes the last tag on Backspace with an empty draft", () => {
		const { fixture, emitted } = render({ tags: ["a", "b"] });

		press(fixture, "Backspace");

		expect(emitted).toEqual([["a"]]);
	});

	it("keeps the tags on Backspace while a draft is being typed", () => {
		const { fixture, emitted } = render({ tags: ["a"] });

		type(fixture, "x");
		press(fixture, "Backspace");

		expect(emitted).toEqual([]);
	});

	describe("suggestions", () => {
		const suggestions = ["cozy", "chill", "intense"];

		function suggestionTexts(
			fixture: ReturnType<typeof render>["fixture"]
		) {
			return Array.from(
				(fixture.nativeElement as HTMLElement).querySelectorAll("li")
			).map(item => item.textContent?.trim());
		}

		it("lists suggestions on focus, excluding already used tags", () => {
			const { fixture } = render({ tags: ["cozy"], suggestions });

			field(fixture).dispatchEvent(new Event("focus"));
			fixture.detectChanges();

			expect(suggestionTexts(fixture)).toEqual(["chill", "intense"]);
		});

		it("filters suggestions by the draft", () => {
			const { fixture } = render({ suggestions });
			field(fixture).dispatchEvent(new Event("focus"));

			type(fixture, "ch");

			expect(suggestionTexts(fixture)).toEqual(["chill"]);
		});

		it("adds a suggestion on mousedown", () => {
			const { fixture, emitted } = render({ suggestions });
			field(fixture).dispatchEvent(new Event("focus"));
			fixture.detectChanges();

			(
				(fixture.nativeElement as HTMLElement).querySelector(
					"li"
				) as HTMLLIElement
			).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

			expect(emitted).toEqual([["cozy"]]);
		});

		it("hides the suggestions shortly after blur", () => {
			vi.useFakeTimers();
			const { fixture } = render({ suggestions });
			field(fixture).dispatchEvent(new Event("focus"));
			fixture.detectChanges();

			field(fixture).dispatchEvent(new Event("blur"));
			vi.advanceTimersByTime(150);
			fixture.detectChanges();
			vi.useRealTimers();

			expect(suggestionTexts(fixture)).toEqual([]);
		});
	});
});
