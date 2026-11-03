import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiButton, type UiButtonVariant } from "./ui-button";

@Component({
	imports: [UiButton],
	template: `
		<button uiButton [variant]="variant()" [active]="active()">Save</button>
		<a uiButton variant="glass" href="/somewhere">Go</a>
	`
})
class Host {
	readonly variant = signal<UiButtonVariant>("primary");
	readonly active = signal(false);
}

describe("UiButton", () => {
	function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const root = fixture.nativeElement as HTMLElement;
		return {
			fixture,
			button: root.querySelector("button") as HTMLButtonElement,
			link: root.querySelector("a") as HTMLAnchorElement
		};
	}

	it("is a primary medium button by default without the active state", () => {
		const { button } = render();

		expect(button.classList).toContain("ui-button");
		expect(button.getAttribute("data-variant")).toBe("primary");
		expect(button.getAttribute("data-size")).toBe("md");
		expect(button.hasAttribute("data-active")).toBe(false);
	});

	it("renders the glass variant used over heroes, also on links", () => {
		const { fixture, button, link } = render();
		fixture.componentInstance.variant.set("glass");
		fixture.detectChanges();

		expect(button.getAttribute("data-variant")).toBe("glass");
		expect(link.getAttribute("data-variant")).toBe("glass");
	});

	it("toggles the active state on and off", () => {
		const { fixture, button } = render();

		fixture.componentInstance.active.set(true);
		fixture.detectChanges();
		expect(button.hasAttribute("data-active")).toBe(true);

		fixture.componentInstance.active.set(false);
		fixture.detectChanges();
		expect(button.hasAttribute("data-active")).toBe(false);
	});
});
