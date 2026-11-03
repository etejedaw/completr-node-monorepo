import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiFiltersButton } from "./ui-filters-button";

@Component({
	imports: [UiFiltersButton],
	template: `
		<button
			uiFiltersButton
			[count]="count()"
			[active]="active()"
			[label]="label()"
			[labelVisibility]="visibility()"
			[popup]="popup()"
			[disabled]="disabled()"
			(click)="clicks.set(clicks() + 1)"
		>
			Filters
		</button>
	`
})
class Host {
	readonly count = signal(0);
	readonly active = signal(false);
	readonly label = signal("Filters");
	readonly visibility = signal<"always" | "wide">("wide");
	readonly popup = signal<"dialog" | null>("dialog");
	readonly disabled = signal(false);
	readonly clicks = signal(0);
}

describe("UiFiltersButton", () => {
	function render(changes: (host: Host) => void = () => undefined) {
		const fixture = TestBed.createComponent(Host);
		changes(fixture.componentInstance);
		fixture.detectChanges();
		const button = (fixture.nativeElement as HTMLElement).querySelector(
			"button"
		) as HTMLButtonElement;
		return { fixture, button };
	}

	it("is a secondary toolbar button named Filters that opens a dialog", () => {
		const { button } = render();

		expect(button).toHaveAccessibleName("Filters");
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("aria-haspopup", "dialog");
		expect(button).toHaveClass("ui-button", "h-10");
		expect(button).toHaveAttribute("data-variant", "secondary");
		expect(button).not.toHaveAttribute("data-active");
		expect(button.querySelector("ui-count-badge")).toBeNull();
	});

	it("keeps a 44px wide target on narrow and touch screens when only the icon shows", () => {
		const { button } = render();

		expect(button).toHaveClass("tap:min-w-[44px]");
		expect(button.querySelector("span.max-sm\\:hidden")).toHaveTextContent(
			"Filters"
		);
	});

	it("counts the active filters in its name and badge", () => {
		const { button } = render(host => host.count.set(3));

		expect(button).toHaveAccessibleName("Filters, 3 active");
		expect(button.querySelector("ui-count-badge")?.textContent).toContain(
			"3"
		);
	});

	it("ignores a zero or negative count", () => {
		const { button } = render(host => host.count.set(-2));

		expect(button).toHaveAccessibleName("Filters");
		expect(button.querySelector("ui-count-badge")).toBeNull();
	});

	it("marks the brand active state while the panel is open or filters apply", () => {
		const { fixture, button } = render(host => host.active.set(true));

		expect(button).toHaveAttribute("data-active", "");
		fixture.componentInstance.active.set(false);
		fixture.detectChanges();
		expect(button).not.toHaveAttribute("data-active");
	});

	it("hides the visible label on narrow screens unless asked to keep it", () => {
		const { fixture, button } = render();
		const label = () =>
			button.querySelector("span:not(.material-icons)") as HTMLElement;

		expect(label()).toHaveClass("max-sm:hidden");
		fixture.componentInstance.visibility.set("always");
		fixture.detectChanges();
		expect(label()).not.toHaveClass("max-sm:hidden");
	});

	it("takes a custom label and drops the popup hint for an inline panel", () => {
		const { button } = render(host => {
			host.label.set("Filters & stats");
			host.count.set(1);
			host.popup.set(null);
		});

		expect(button).toHaveAccessibleName("Filters & stats, 1 active");
		expect(button).not.toHaveAttribute("aria-haspopup");
	});

	it("follows a count that changes between clicks", () => {
		const { fixture, button } = render(host => host.count.set(1));

		button.click();
		fixture.componentInstance.count.set(4);
		fixture.detectChanges();
		button.click();

		expect(fixture.componentInstance.clicks()).toBe(2);
		expect(button).toHaveAccessibleName("Filters, 4 active");
	});

	it("does not react while disabled", () => {
		const { fixture, button } = render(host => host.disabled.set(true));

		button.click();

		expect(button).toBeDisabled();
		expect(fixture.componentInstance.clicks()).toBe(0);
	});

	it("shows the projected text as the visible label", () => {
		const { button } = render();

		expect(button.textContent).toContain("Filters");
	});

	it("falls back to the label input when nothing is projected", () => {
		const fixture = TestBed.createComponent(UiFiltersButton);
		fixture.componentRef.setInput("label", "Filters & stats");
		fixture.detectChanges();
		const button = fixture.nativeElement as HTMLElement;

		expect(button.textContent).toContain("Filters & stats");
		expect(button).toHaveAccessibleName("Filters & stats");
	});
});
