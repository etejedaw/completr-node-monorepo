import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiCheckbox } from "./ui-checkbox";

@Component({
	imports: [UiCheckbox],
	template: `
		<ui-checkbox
			[label]="label()"
			[ariaLabel]="ariaLabel()"
			[indeterminate]="indeterminate()"
			[disabled]="disabled()"
			[(checked)]="checked"
		/>
	`
})
class Host {
	readonly label = signal("Copy cover");
	readonly ariaLabel = signal("");
	readonly indeterminate = signal(false);
	readonly disabled = signal(false);
	readonly checked = signal(false);
}

describe("UiCheckbox", () => {
	function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const box = (fixture.nativeElement as HTMLElement).querySelector(
			"[role='checkbox']"
		) as HTMLElement;
		return { fixture, host: fixture.componentInstance, box };
	}

	it("toggles from the box and from the visible label", () => {
		const { fixture, host, box } = render();
		box.click();
		fixture.detectChanges();
		expect(host.checked()).toBe(true);
		expect(box.getAttribute("aria-checked")).toBe("true");

		const label = (fixture.nativeElement as HTMLElement).querySelector(
			".ui-checkbox__label"
		) as HTMLElement;
		label.click();
		fixture.detectChanges();
		expect(host.checked()).toBe(false);
		expect(box.getAttribute("aria-checked")).toBe("false");
	});

	it("names the box with the label, or with ariaLabel when given", () => {
		const { fixture, host, box } = render();
		expect(box.getAttribute("aria-label")).toBe("Copy cover");
		host.label.set("");
		host.ariaLabel.set("Select Hollow Knight");
		fixture.detectChanges();
		expect(box.getAttribute("aria-label")).toBe("Select Hollow Knight");
		expect(
			(fixture.nativeElement as HTMLElement).querySelector(
				".ui-checkbox__label"
			)
		).toBeNull();
	});

	it("reports the indeterminate state as mixed", () => {
		const { fixture, host, box } = render();
		host.indeterminate.set(true);
		fixture.detectChanges();
		expect(box.getAttribute("aria-checked")).toBe("mixed");
		expect(box.hasAttribute("data-indeterminate")).toBe(true);

		host.indeterminate.set(false);
		host.checked.set(true);
		fixture.detectChanges();
		expect(box.getAttribute("aria-checked")).toBe("true");
		expect(box.hasAttribute("data-indeterminate")).toBe(false);
	});

	it("checks a mixed box on click", () => {
		const { fixture, host, box } = render();
		host.indeterminate.set(true);
		fixture.detectChanges();
		box.click();
		fixture.detectChanges();
		expect(host.checked()).toBe(true);
		expect(box.getAttribute("aria-checked")).toBe("true");
	});

	it("does not toggle while disabled", () => {
		const { fixture, host, box } = render();
		host.disabled.set(true);
		fixture.detectChanges();
		box.click();
		fixture.detectChanges();
		expect(host.checked()).toBe(false);
		expect(box.getAttribute("aria-disabled")).toBe("true");
	});
});
