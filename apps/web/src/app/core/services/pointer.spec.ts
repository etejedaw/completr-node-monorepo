import { TestBed } from "@angular/core/testing";

import { PointerService } from "./pointer";

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

describe("PointerService", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("queries the coarse pointer", () => {
		const media = stubMatchMedia(false);

		TestBed.inject(PointerService);

		expect(media.matchMedia).toHaveBeenCalledWith("(pointer: coarse)");
	});

	it("starts as coarse when the query matches", () => {
		stubMatchMedia(true);

		expect(TestBed.inject(PointerService).isCoarse()).toBe(true);
	});

	it("starts as fine when the query does not match", () => {
		stubMatchMedia(false);

		expect(TestBed.inject(PointerService).isCoarse()).toBe(false);
	});

	it("follows changes of the media query", () => {
		const media = stubMatchMedia(false);
		const viewport = TestBed.inject(PointerService);

		media.emit(true);
		expect(viewport.isCoarse()).toBe(true);

		media.emit(false);
		expect(viewport.isCoarse()).toBe(false);
	});
});
