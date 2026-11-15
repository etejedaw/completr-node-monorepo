import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import {
	UiSelectableRow,
	type UiSelectableRowVariant
} from "./ui-selectable-row";

@Component({
	imports: [UiSelectableRow],
	template: `
		<button
			type="button"
			uiSelectableRow
			[variant]="variant()"
			[selected]="selected()"
			[disabled]="disabled()"
			(click)="clicks.set(clicks() + 1)"
		>
			<span>Celeste</span>
			<span>extra</span>
		</button>
	`
})
class Host {
	readonly variant = signal<UiSelectableRowVariant>("row");
	readonly selected = signal<boolean | null>(null);
	readonly disabled = signal(false);
	readonly clicks = signal(0);
}

describe("UiSelectableRow", () => {
	function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const button = (fixture.nativeElement as HTMLElement).querySelector(
			"button"
		) as HTMLButtonElement;
		return { fixture, host: fixture.componentInstance, button };
	}

	it("projects its content and stays a native button", () => {
		const { button } = render();

		expect(button.tagName).toBe("BUTTON");
		expect(button.textContent).toContain("Celeste");
		expect(button.textContent).toContain("extra");
	});

	it("exposes no pressed state until a selection is bound", () => {
		const { fixture, host, button } = render();

		expect(button.hasAttribute("aria-pressed")).toBe(false);

		host.selected.set(false);
		fixture.detectChanges();
		expect(button.getAttribute("aria-pressed")).toBe("false");

		host.selected.set(true);
		fixture.detectChanges();
		expect(button.getAttribute("aria-pressed")).toBe("true");
	});

	it("keeps a visible focus ring and a 44px minimum height in both variants", () => {
		const { fixture, host, button } = render();

		for (const variant of ["row", "card"] as const) {
			host.variant.set(variant);
			fixture.detectChanges();
			expect(button.classList).toContain("focus-visible:outline-brand");
			expect(
				Array.from(button.classList).some(c =>
					/^min-h-\[(44|52)px\]$/.test(c)
				)
			).toBe(true);
		}
	});

	it("highlights a selected card with the brand border", () => {
		const { fixture, host, button } = render();
		host.variant.set("card");
		fixture.detectChanges();
		expect(button.classList).toContain("border-line");

		host.selected.set(true);
		fixture.detectChanges();

		expect(button.classList).toContain("border-brand");
		expect(button.classList).not.toContain("border-line");
	});

	it("reports every click of a double click", () => {
		const { fixture, host, button } = render();

		button.click();
		button.click();
		fixture.detectChanges();

		expect(host.clicks()).toBe(2);
	});

	it("ignores clicks while disabled and recovers when enabled again", () => {
		const { fixture, host, button } = render();
		host.disabled.set(true);
		fixture.detectChanges();

		button.click();
		expect(host.clicks()).toBe(0);

		host.disabled.set(false);
		fixture.detectChanges();
		button.click();

		expect(host.clicks()).toBe(1);
	});

	it("survives switching variants and selection in any order", () => {
		const { fixture, host, button } = render();

		for (const [variant, selected] of [
			["card", true],
			["row", null],
			["card", false],
			["row", true]
		] as const) {
			host.variant.set(variant);
			host.selected.set(selected);
			fixture.detectChanges();
		}

		expect(button.classList).toContain("bg-brand-subtle");
		expect(button.getAttribute("aria-pressed")).toBe("true");
	});
});
