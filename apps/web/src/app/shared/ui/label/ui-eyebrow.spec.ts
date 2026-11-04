import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiEyebrow, type UiEyebrowTone } from "./ui-eyebrow";

@Component({
	imports: [UiEyebrow],
	template: `<p uiEyebrow [tone]="tone" class="m-0">Section</p>`
})
class HostComponent {
	tone: UiEyebrowTone = "muted";
}

describe("UiEyebrow", () => {
	function renderedEyebrow(tone?: UiEyebrowTone) {
		const fixture = TestBed.createComponent(HostComponent);
		if (tone) {
			fixture.componentInstance.tone = tone;
		}
		fixture.detectChanges();
		return fixture.nativeElement.querySelector("p") as HTMLElement;
	}

	it("uses the muted tone by default", () => {
		const eyebrow = renderedEyebrow();

		expect(eyebrow.classList).toContain("text-fg-muted");
		expect(eyebrow.classList).toContain("text-[0.625rem]");
		expect(eyebrow.classList).toContain("tracking-[0.16em]");
	});

	it("paints the brand tone with the wider size and tracking", () => {
		const eyebrow = renderedEyebrow("brand");

		expect(eyebrow.classList).toContain("text-brand");
		expect(eyebrow.classList).toContain("text-[0.6875rem]");
		expect(eyebrow.classList).toContain("tracking-[0.2em]");
		expect(eyebrow.classList).not.toContain("text-fg-muted");
	});

	it("paints the premium tone", () => {
		const eyebrow = renderedEyebrow("premium");

		expect(eyebrow.classList).toContain("text-premium");
		expect(eyebrow.classList).not.toContain("text-brand");
	});

	it.each<UiEyebrowTone>(["muted", "brand", "premium"])(
		"keeps the base classes and the consumer classes in the %s tone",
		tone => {
			const eyebrow = renderedEyebrow(tone);

			expect(eyebrow.classList).toContain("block");
			expect(eyebrow.classList).toContain("font-semibold");
			expect(eyebrow.classList).toContain("uppercase");
			expect(eyebrow.classList).toContain("m-0");
		}
	);
});
