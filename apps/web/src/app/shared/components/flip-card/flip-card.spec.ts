import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { FlipCard } from "./flip-card";

@Component({
	imports: [FlipCard],
	template: `
		<app-flip-card [flipped]="flipped">
			<div flipCardFront>Front</div>
			<div flipCardBack>Back</div>
		</app-flip-card>
	`
})
class Host {
	flipped = false;
}

describe("FlipCard", () => {
	function render(flipped: boolean) {
		const fixture = TestBed.createComponent(Host);
		fixture.componentInstance.flipped = flipped;
		fixture.detectChanges();
		const root = fixture.nativeElement as HTMLElement;
		const front = root.querySelector("[flipCardFront]")
			?.parentElement as HTMLElement;
		const back = root.querySelector("[flipCardBack]")
			?.parentElement as HTMLElement;
		const rotating = front.parentElement as HTMLElement;
		return { fixture, front, back, rotating };
	}

	it("shows the front face when not flipped", () => {
		const { front, back, rotating } = render(false);

		expect(rotating.style.transform).toBe("rotateY(0deg)");
		expect(front.hasAttribute("inert")).toBe(false);
		expect(front.getAttribute("aria-hidden")).toBe("false");
		expect(back.hasAttribute("inert")).toBe(true);
		expect(back.getAttribute("aria-hidden")).toBe("true");
	});

	it("shows the back face when flipped", () => {
		const { front, back, rotating } = render(true);

		expect(rotating.style.transform).toBe("rotateY(180deg)");
		expect(front.hasAttribute("inert")).toBe(true);
		expect(front.getAttribute("aria-hidden")).toBe("true");
		expect(back.hasAttribute("inert")).toBe(false);
		expect(back.getAttribute("aria-hidden")).toBe("false");
	});

	it("projects both faces", () => {
		const { fixture } = render(false);

		expect((fixture.nativeElement as HTMLElement).textContent).toContain(
			"Front"
		);
		expect((fixture.nativeElement as HTMLElement).textContent).toContain(
			"Back"
		);
	});
});
