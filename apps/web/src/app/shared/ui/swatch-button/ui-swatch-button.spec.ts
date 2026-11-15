import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiSwatchButton, type UiSwatchShape } from "./ui-swatch-button";

@Component({
	imports: [UiSwatchButton],
	template: `
		<div role="group" aria-label="Swatches">
			@for (option of options; track option) {
				<button
					type="button"
					uiSwatchButton
					[shape]="shape()"
					[color]="shape() === 'circle' ? option : null"
					[selected]="selected() === option"
					[attr.aria-label]="option"
					(click)="pick(option)"
				>
					<span class="material-icons">{{ option }}</span>
				</button>
			}
		</div>
	`
})
class Host {
	readonly options = ["red", "green", "blue"];
	readonly shape = signal<UiSwatchShape>("square");
	readonly selected = signal<string | null>(null);
	readonly picks: string[] = [];

	pick(option: string) {
		this.picks.push(option);
		this.selected.set(option);
	}
}

describe("UiSwatchButton", () => {
	function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		const buttons = () =>
			Array.from(
				(fixture.nativeElement as HTMLElement).querySelectorAll(
					"button"
				)
			);
		return { fixture, host: fixture.componentInstance, buttons };
	}

	it("starts unpressed and marks only the chosen swatch as pressed", () => {
		const { fixture, buttons } = render();

		expect(buttons().map(b => b.getAttribute("aria-pressed"))).toEqual([
			"false",
			"false",
			"false"
		]);

		buttons()[1].click();
		fixture.detectChanges();

		expect(buttons().map(b => b.getAttribute("aria-pressed"))).toEqual([
			"false",
			"true",
			"false"
		]);
	});

	it("keeps exactly one pressed swatch after rapid clicks on different ones", () => {
		const { fixture, host, buttons } = render();

		for (const index of [0, 2, 1, 0, 0, 2]) {
			buttons()[index].click();
			fixture.detectChanges();
		}

		expect(host.picks).toHaveLength(6);
		expect(
			buttons().filter(b => b.getAttribute("aria-pressed") === "true")
		).toHaveLength(1);
		expect(buttons()[2].getAttribute("aria-pressed")).toBe("true");
	});

	it("stays pressed after a double click on the same swatch", () => {
		const { fixture, buttons } = render();

		buttons()[0].click();
		buttons()[0].click();
		fixture.detectChanges();

		expect(buttons()[0].getAttribute("aria-pressed")).toBe("true");
	});

	it("highlights the selected square swatch with the brand border", () => {
		const { fixture, buttons } = render();
		buttons()[0].click();
		fixture.detectChanges();

		expect(buttons()[0].classList).toContain("border-brand");
		expect(buttons()[1].classList).toContain("border-line");
	});

	it("keeps the 44px touch target on every swatch", () => {
		const { fixture, host, buttons } = render();

		for (const shape of ["square", "circle"] as const) {
			host.shape.set(shape);
			fixture.detectChanges();
			for (const button of buttons()) {
				expect(button.classList).toContain("tap:size-[44px]");
				expect(button.classList).toContain("max-md:size-[44px]");
			}
		}
	});

	it("paints a circle swatch with its color and a ring when selected", () => {
		const { fixture, host, buttons } = render();
		host.shape.set("circle");
		fixture.detectChanges();
		buttons()[1].click();
		fixture.detectChanges();

		expect(buttons()[1].style.background).toBe("green");
		expect(buttons()[1].classList).toContain("ring-2");
		expect(buttons()[0].classList).not.toContain("ring-2");
	});

	it("is operable with Enter and Space as a native button", () => {
		const { fixture, buttons } = render();
		const button = buttons()[2];
		button.focus();

		expect(document.activeElement).toBe(button);
		expect(button.tagName).toBe("BUTTON");
		button.click();
		fixture.detectChanges();

		expect(button.getAttribute("aria-pressed")).toBe("true");
	});

	it("does not fire when the swatch is disabled", () => {
		const { fixture, host, buttons } = render();
		const button = buttons()[0];
		button.disabled = true;
		button.click();
		fixture.detectChanges();

		expect(host.picks).toEqual([]);
	});
});
