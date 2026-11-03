import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiIconButton, type UiIconButtonShape } from "./ui-icon-button";

@Component({
	imports: [UiIconButton],
	template: `
		<button uiIconButton [shape]="shape()" aria-label="Close">x</button>
		<a uiIconButton size="lg" href="/settings" aria-label="Settings">s</a>
	`
})
class Host {
	readonly shape = signal<UiIconButtonShape>("rounded");
}

describe("UiIconButton", () => {
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

	it("is a rounded neutral medium icon button by default", () => {
		const { button } = render();

		expect(button.classList).toContain("ui-icon-button");
		expect(button.getAttribute("data-shape")).toBe("rounded");
		expect(button.getAttribute("data-tone")).toBe("neutral");
		expect(button.getAttribute("data-size")).toBe("md");
	});

	it("switches to the circle shape", () => {
		const { fixture, button } = render();
		fixture.componentInstance.shape.set("circle");
		fixture.detectChanges();

		expect(button.getAttribute("data-shape")).toBe("circle");
	});

	it("styles links as icon buttons too", () => {
		const { link } = render();

		expect(link.classList).toContain("ui-icon-button");
		expect(link.getAttribute("data-size")).toBe("lg");
		expect(link.getAttribute("href")).toBe("/settings");
	});
});
