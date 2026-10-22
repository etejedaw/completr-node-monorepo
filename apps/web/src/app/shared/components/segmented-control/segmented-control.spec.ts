import { TestBed } from "@angular/core/testing";

import { SegmentedControl, type SegmentedOption } from "./segmented-control";

const options: SegmentedOption[] = [
	{ value: "all", label: "All", count: 12 },
	{ value: "mine", label: "Mine", icon: "person", hint: "Only yours" },
	{ value: "none", label: "None", count: 0 }
];

describe("SegmentedControl", () => {
	function render(value = "all") {
		const fixture = TestBed.createComponent(SegmentedControl);
		fixture.componentRef.setInput("options", options);
		fixture.componentRef.setInput("label", "Scope");
		fixture.componentRef.setInput("value", value);
		fixture.detectChanges();
		return fixture;
	}

	function radios(fixture: ReturnType<typeof render>) {
		return Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll(
				'[role="radio"]'
			)
		) as HTMLButtonElement[];
	}

	it("renders a labelled radiogroup with one radio per option", () => {
		const fixture = render();
		const group = (fixture.nativeElement as HTMLElement).querySelector(
			'[role="radiogroup"]'
		);

		expect(group?.getAttribute("aria-label")).toBe("Scope");
		expect(radios(fixture).map(radio => radio.textContent?.trim())).toEqual(
			["All 12", "person Mine", "None 0"]
		);
	});

	it("checks only the radio of the current value", () => {
		const fixture = render("mine");

		expect(
			radios(fixture).map(r => r.getAttribute("aria-checked"))
		).toEqual(["false", "true", "false"]);
	});

	it("exposes the hint as a title and omits it otherwise", () => {
		const fixture = render();

		expect(radios(fixture)[1].getAttribute("title")).toBe("Only yours");
		expect(radios(fixture)[0].hasAttribute("title")).toBe(false);
	});

	it("shows a zero count", () => {
		const fixture = render();

		expect(radios(fixture)[2].textContent).toContain("0");
	});

	it("updates the model when a radio is clicked", () => {
		const fixture = render();

		radios(fixture)[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("mine");
		expect(radios(fixture)[1].getAttribute("aria-checked")).toBe("true");
		expect(radios(fixture)[0].getAttribute("aria-checked")).toBe("false");
	});
});
