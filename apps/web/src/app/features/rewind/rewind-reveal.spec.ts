import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { RewindReveal } from "./rewind-reveal";

@Component({
	selector: "app-reveal-host",
	imports: [RewindReveal],
	template: `<section appRewindReveal [revealDelay]="120">Results</section>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class RevealHost {}

describe("RewindReveal", () => {
	let observerCallback: (entries: { isIntersecting: boolean }[]) => void;
	let disconnect: ReturnType<typeof vi.fn>;
	let reducedMotion: boolean;

	function stubBrowser({ observer = true } = {}) {
		disconnect = vi.fn();
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: reducedMotion }))
		);
		if (observer) {
			vi.stubGlobal(
				"IntersectionObserver",
				class {
					constructor(handler: typeof observerCallback) {
						observerCallback = handler;
					}
					observe = vi.fn();
					disconnect = disconnect;
				}
			);
		} else {
			vi.stubGlobal("IntersectionObserver", undefined);
		}
	}

	async function render() {
		const fixture = TestBed.createComponent(RevealHost);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	function section(fixture: { nativeElement: HTMLElement }) {
		return fixture.nativeElement.querySelector("section")!;
	}

	beforeEach(() => {
		reducedMotion = false;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("stays hidden until the section enters the screen, then shows with its delay", async () => {
		stubBrowser();
		const fixture = await render();
		expect(section(fixture).dataset["reveal"]).toBe("hidden");
		expect(section(fixture).style.transitionDelay).toBe("0ms");

		observerCallback([{ isIntersecting: true }]);
		fixture.detectChanges();

		expect(section(fixture).dataset["reveal"]).toBe("shown");
		expect(section(fixture).style.transitionDelay).toBe("120ms");
		expect(disconnect).toHaveBeenCalled();
	});

	it("does not reveal when a fast scroll only reports it leaving the screen", async () => {
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: false }]);
		fixture.detectChanges();

		expect(section(fixture).dataset["reveal"]).toBe("hidden");
	});

	it("reveals once and never hides again when scrolled past and back quickly", async () => {
		stubBrowser();
		const fixture = await render();

		observerCallback([{ isIntersecting: false }, { isIntersecting: true }]);
		observerCallback([{ isIntersecting: false }]);
		observerCallback([{ isIntersecting: true }]);
		fixture.detectChanges();

		expect(section(fixture).dataset["reveal"]).toBe("shown");
		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it("shows the final state right away when the user prefers reduced motion", async () => {
		reducedMotion = true;
		stubBrowser();
		const fixture = await render();

		expect(section(fixture).dataset["reveal"]).toBe("shown");
	});

	it("shows the content when the browser cannot observe the viewport", async () => {
		stubBrowser({ observer: false });
		const fixture = await render();

		expect(section(fixture).dataset["reveal"]).toBe("shown");
	});

	it("keeps the hidden state behind motion-safe so CSS without motion never hides it", async () => {
		stubBrowser();
		const fixture = await render();

		const hidingClasses = [...section(fixture).classList].filter(name =>
			name.includes("reveal=hidden")
		);
		expect(hidingClasses.length).toBeGreaterThan(0);
		expect(
			hidingClasses.every(name => name.startsWith("motion-safe:"))
		).toBe(true);
	});

	it("stops observing when the page is left before the section was seen", async () => {
		stubBrowser();
		const fixture = await render();

		fixture.destroy();

		expect(disconnect).toHaveBeenCalled();
	});
});
