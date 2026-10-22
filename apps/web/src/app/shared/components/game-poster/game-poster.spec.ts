import { TestBed } from "@angular/core/testing";

import { GamePoster } from "./game-poster";

describe("GamePoster", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(GamePoster);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("renders the cover image with the title as alt text", () => {
		const element = render({
			src: "https://example.com/hades.jpg",
			title: "Hades"
		});
		const image = element.querySelector("img") as HTMLImageElement;

		expect(image.src).toBe("https://example.com/hades.jpg");
		expect(image.alt).toBe("Hades");
		expect(image.getAttribute("loading")).toBe("lazy");
	});

	it("requests the RAWG resized version with the given width", () => {
		const element = render({
			src: "https://media.rawg.io/media/games/a/hades.jpg",
			title: "Hades",
			width: 200
		});

		expect(element.querySelector("img")?.src).toBe(
			"https://media.rawg.io/media/resize/200/-/games/a/hades.jpg"
		);
	});

	it.each([null, undefined, ""])(
		"falls back to a titled placeholder when src is %j",
		src => {
			const element = render({ src, title: "Hades" });

			expect(element.querySelector("img")).toBeNull();
			const fallback = element.querySelector('[role="img"]');
			expect(fallback?.getAttribute("aria-label")).toBe("Hades");
			expect(fallback?.textContent).toContain("Hades");
		}
	);

	it("hides the title text in compact mode", () => {
		const element = render({ title: "Hades", compact: true });

		expect(
			element.querySelector('[role="img"]')?.textContent
		).not.toContain("Hades");
	});

	it("derives the same gradient for the same title and another for a different one", () => {
		const background = (title: string) =>
			(render({ title }).querySelector('[role="img"]') as HTMLElement)
				.style.background;

		expect(background("Hades")).toBe(background("Hades"));
		expect(background("Hades")).not.toBe(background("Celeste"));
	});
});
