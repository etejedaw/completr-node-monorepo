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
			width: 420
		});

		expect(element.querySelector("img")?.src).toBe(
			"https://media.rawg.io/media/resize/420/-/games/a/hades.jpg"
		);
	});

	describe("when the image fails", () => {
		const original = "https://media.rawg.io/media/games/a/hades.jpg";
		const resized =
			"https://media.rawg.io/media/resize/420/-/games/a/hades.jpg";

		function mount(src: string) {
			const fixture = TestBed.createComponent(GamePoster);
			fixture.componentRef.setInput("src", src);
			fixture.componentRef.setInput("title", "Hades");
			fixture.detectChanges();
			const element = fixture.nativeElement as HTMLElement;
			return {
				fixture,
				element,
				image: () => element.querySelector("img"),
				placeholder: () => element.querySelector('[role="img"]'),
				fail: () => {
					element.querySelector("img")?.dispatchEvent(new Event("error"));
					fixture.detectChanges();
				}
			};
		}

		it("switches to the original url on the first error", () => {
			const view = mount(original);
			expect(view.image()?.src).toBe(resized);

			view.fail();

			expect(view.image()?.src).toBe(original);
			expect(view.placeholder()).toBeNull();
		});

		it("shows the placeholder when the original also fails", () => {
			const view = mount(original);

			view.fail();
			view.fail();

			expect(view.image()).toBeNull();
			expect(view.placeholder()?.getAttribute("aria-label")).toBe("Hades");
		});

		it("goes straight to the placeholder for a non-RAWG src", () => {
			const view = mount("https://example.com/hades.jpg");

			view.fail();

			expect(view.image()).toBeNull();
			expect(view.placeholder()).not.toBeNull();
		});

		it("tries the resized url again when src changes after a failure", () => {
			const view = mount(original);
			view.fail();
			view.fail();

			view.fixture.componentRef.setInput(
				"src",
				"https://media.rawg.io/media/games/b/celeste.jpg"
			);
			view.fixture.detectChanges();

			expect(view.image()?.src).toBe(
				"https://media.rawg.io/media/resize/420/-/games/b/celeste.jpg"
			);
		});

		it("ignores a repeated error event before the view updates", () => {
			const view = mount(original);
			const image = view.image() as HTMLImageElement;

			image.dispatchEvent(new Event("error"));
			image.dispatchEvent(new Event("error"));
			view.fixture.detectChanges();

			expect(view.image()?.src).toBe(original);
		});
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

	it("has no frame unless asked", () => {
		const host = render({ title: "Hades", src: null });

		expect(host.classList).not.toContain("ring-1");
	});

	it("draws the cover frame with the line token", () => {
		const host = render({ title: "Hades", src: null, framed: true });

		expect(host.classList).toContain("ring-1");
		expect(host.classList).toContain("ring-line-hover");
	});

	it("accepts framed as a bare attribute value", () => {
		const host = render({ title: "Hades", framed: "" });

		expect(host.classList).toContain("ring-line-hover");
	});
});
