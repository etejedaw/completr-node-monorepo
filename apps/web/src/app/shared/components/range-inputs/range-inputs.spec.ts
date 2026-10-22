import { TestBed } from "@angular/core/testing";

import { RangeInputs } from "./range-inputs";

describe("RangeInputs", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(RangeInputs);
		fixture.componentRef.setInput("label", "Hours");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const fields = Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll("input")
		) as HTMLInputElement[];
		return { fixture, minInput: fields[0], maxInput: fields[1] };
	}

	function type(field: HTMLInputElement, value: string) {
		field.value = value;
		field.dispatchEvent(new Event("input"));
	}

	it("renders min and max fields with the default labels and placeholders", () => {
		const { fixture, minInput, maxInput } = render();
		const text = (fixture.nativeElement as HTMLElement).textContent;

		expect(text).toContain("Min");
		expect(text).toContain("Max");
		expect(minInput.hasAttribute("placeholder")).toBe(false);
		expect(maxInput.getAttribute("placeholder")).toBe("Any");
		expect(minInput.getAttribute("min")).toBe("0");
		expect(minInput.hasAttribute("max")).toBe(false);
		expect(minInput.getAttribute("step")).toBe("any");
	});

	it("prefixes the accessible label to each field name", () => {
		const { fixture } = render();

		expect(
			(fixture.nativeElement as HTMLElement).querySelector(".sr-only")
				?.textContent
		).toBe("Hours, ");
	});

	it("applies custom bounds and step", () => {
		const { minInput, maxInput } = render({
			lowerBound: 1,
			upperBound: 100,
			step: 5
		});

		expect(maxInput.getAttribute("min")).toBe("1");
		expect(minInput.getAttribute("max")).toBe("100");
		expect(maxInput.getAttribute("step")).toBe("5");
	});

	it("shows the current min and max values", () => {
		const { fixture, minInput, maxInput } = render({ min: 2, max: 10 });
		fixture.detectChanges();

		expect(minInput.value).toBe("2");
		expect(maxInput.value).toBe("10");
	});

	it("updates the models with parsed numbers", () => {
		const { fixture, minInput, maxInput } = render();

		type(minInput, "3.5");
		type(maxInput, "12");

		expect(fixture.componentInstance.min()).toBe(3.5);
		expect(fixture.componentInstance.max()).toBe(12);
	});

	it("clears the model when the field is emptied", () => {
		const { fixture, minInput } = render({ min: 4 });

		type(minInput, "");

		expect(fixture.componentInstance.min()).toBeNull();
	});
});
