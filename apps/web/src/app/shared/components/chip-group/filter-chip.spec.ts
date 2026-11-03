import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import {
	FilterChip,
	type FilterChipSize,
	type FilterChipTouchTarget
} from "./filter-chip";

@Component({
	imports: [FilterChip],
	template: `<button
		appFilterChip
		class="extra-layout"
		[chipSize]="size()"
		[selected]="selected()"
		[touchTarget]="target()"
	>
		Chip
	</button>`
})
class Host {
	readonly size = signal<FilterChipSize>("sm");
	readonly selected = signal(false);
	readonly target = signal<FilterChipTouchTarget>("grow");
}

describe("FilterChip", () => {
	function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const chip = (fixture.nativeElement as HTMLElement).querySelector(
			"button"
		) as HTMLButtonElement;
		return { fixture, chip };
	}

	it("is a small idle pill that grows to 44px on touch by default", () => {
		const { chip } = render();

		expect(chip.type).toBe("button");
		expect(chip.classList).toContain("rounded-full");
		expect(chip.classList).toContain("text-xs");
		expect(chip.classList).toContain("bg-input-bg");
		expect(chip.classList).toContain("tap:min-h-[44px]");
		expect(chip.hasAttribute("data-selected")).toBe(false);
	});

	it("keeps the classes the caller puts on the chip", () => {
		const { fixture, chip } = render();
		fixture.componentInstance.selected.set(true);
		fixture.detectChanges();

		expect(chip.classList).toContain("extra-layout");
	});

	it("paints the brand state only while selected", () => {
		const { fixture, chip } = render();
		fixture.componentInstance.selected.set(true);
		fixture.detectChanges();

		expect(chip.classList).toContain("text-brand");
		expect(chip.classList).not.toContain("bg-input-bg");
		expect(chip.hasAttribute("data-selected")).toBe(true);

		fixture.componentInstance.selected.set(false);
		fixture.detectChanges();
		expect(chip.classList).not.toContain("text-brand");
		expect(chip.classList).toContain("bg-input-bg");
	});

	it("uses the medium size over the page and an invisible touch area in scrollers", () => {
		const { fixture, chip } = render();
		fixture.componentInstance.size.set("md");
		fixture.componentInstance.target.set("area");
		fixture.detectChanges();

		expect(chip.classList).toContain("h-9");
		expect(chip.classList).toContain("bg-surface/60");
		expect(chip.classList).toContain("tap-area");
		expect(chip.classList).not.toContain("tap:min-h-[44px]");
	});
});
