import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { GamePosterGrid } from "./game-poster-grid";
import { type PosterGridGame } from "./game-poster-grid.model";

const game = (overrides: Partial<PosterGridGame>) =>
	({
		id: "g1",
		code: "celeste",
		title: "Celeste",
		coverUrl: "https://img.test/cover.jpg",
		backgroundUrl: "https://img.test/background.jpg",
		...overrides
	}) as PosterGridGame;

describe("GamePosterGrid", () => {
	function render(games: PosterGridGame[], wide = false) {
		const fixture = TestBed.createComponent(GamePosterGrid);
		fixture.componentRef.setInput("games", games);
		fixture.componentRef.setInput("wide", wide);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [GamePosterGrid],
			providers: [provideRouter([])]
		});
	});

	it("links each poster to its game page and shows the title", () => {
		const element = render([
			game({ id: "1", code: "celeste", title: "Celeste" }),
			game({ id: "2", code: "hades", title: "Hades" })
		]);

		const links = Array.from(element.querySelectorAll("a"));
		expect(links.map(a => a.getAttribute("href"))).toEqual([
			"/games/celeste",
			"/games/hades"
		]);
		expect(links[1].textContent).toContain("Hades");
	});

	it("shows the ratio badge only when the game has one", () => {
		const element = render([
			game({ id: "1", ratio: 4.2 }),
			game({ id: "2", ratio: null }),
			game({ id: "3" })
		]);

		const badges = element.querySelectorAll("[aria-label^='Ratio']");
		expect(badges).toHaveLength(1);
		expect(badges[0].getAttribute("aria-label")).toBe("Ratio 4.2");
		expect(badges[0].textContent?.trim()).toBe("4.2");
	});

	it("prefers the cover and falls back to the background", () => {
		const withCover = render([game({})]);
		const withoutCover = render([game({ coverUrl: undefined })]);

		expect(
			(withCover.querySelector("img") as HTMLImageElement).src
		).toContain("cover.jpg");
		expect(
			(withoutCover.querySelector("img") as HTMLImageElement).src
		).toContain("background.jpg");
	});

	it("lays out as a grid by default and as a scroll strip when wide", () => {
		const grid = render([game({})]);
		const strip = render([game({})], true);

		expect(grid.querySelector("ul")?.className).toContain("grid");
		expect(grid.querySelector("li")?.className).not.toContain("snap-start");
		expect(strip.querySelector("ul")?.className).toContain(
			"overflow-x-auto"
		);
		expect(strip.querySelector("li")?.className).toContain("snap-start");
	});
});
