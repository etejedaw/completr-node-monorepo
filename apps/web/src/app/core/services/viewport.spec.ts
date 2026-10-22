import { TestBed } from "@angular/core/testing";

import { ViewportService } from "./viewport";

function stubMatchMedia(matches: boolean) {
	let listener: ((event: { matches: boolean }) => void) | null = null;
	const query = {
		matches,
		addEventListener: vi.fn(
			(_type: string, handler: (event: { matches: boolean }) => void) => {
				listener = handler;
			}
		)
	};
	const matchMedia = vi.fn(() => query);
	vi.stubGlobal("matchMedia", matchMedia);
	return {
		matchMedia,
		emit: (next: boolean) => listener?.({ matches: next })
	};
}

describe("ViewportService", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("queries the mobile breakpoint", () => {
		const media = stubMatchMedia(false);

		TestBed.inject(ViewportService);

		expect(media.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
	});

	it("starts as mobile when the query matches", () => {
		stubMatchMedia(true);

		expect(TestBed.inject(ViewportService).isMobile()).toBe(true);
	});

	it("starts as desktop when the query does not match", () => {
		stubMatchMedia(false);

		expect(TestBed.inject(ViewportService).isMobile()).toBe(false);
	});

	it("follows changes of the media query", () => {
		const media = stubMatchMedia(false);
		const viewport = TestBed.inject(ViewportService);

		media.emit(true);
		expect(viewport.isMobile()).toBe(true);

		media.emit(false);
		expect(viewport.isMobile()).toBe(false);
	});
});
