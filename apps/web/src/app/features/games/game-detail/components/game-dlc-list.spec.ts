import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type GameSummary } from "../../../../core/models";
import { GameDlcList } from "./game-dlc-list";

const dlc = (overrides: Partial<GameSummary>) =>
	({
		id: "d1",
		code: "hades-ii-dlc",
		title: "Hades DLC",
		coverUrl: "https://img.test/cover.jpg",
		backgroundUrl: undefined,
		...overrides
	}) as GameSummary;

describe("GameDlcList", () => {
	function render(dlcs: GameSummary[]) {
		const fixture = TestBed.createComponent(GameDlcList);
		fixture.componentRef.setInput("dlcs", dlcs);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [GameDlcList],
			providers: [provideRouter([])]
		});
	});

	it("renders nothing when there are no DLCs", () => {
		expect(render([]).querySelectorAll("li")).toHaveLength(0);
	});

	it("links each DLC to its game page with a DLC badge", () => {
		const element = render([
			dlc({ id: "d1", code: "alpha", title: "Alpha DLC" }),
			dlc({ id: "d2", code: "beta", title: "Beta DLC" })
		]);

		const links = Array.from(element.querySelectorAll("a"));
		expect(links.map(a => a.getAttribute("href"))).toEqual([
			"/games/alpha",
			"/games/beta"
		]);
		expect(links[0].textContent).toContain("Alpha DLC");
		expect(links[0].textContent).toContain("DLC");
	});

	it("prefers the background image over the cover", () => {
		const element = render([
			dlc({
				coverUrl: "https://img.test/cover.jpg",
				backgroundUrl: "https://img.test/background.jpg"
			})
		]);

		const image = element.querySelector("img") as HTMLImageElement;
		expect(image.src).toContain("background.jpg");
	});

	it("falls back to the cover when there is no background", () => {
		const element = render([dlc({ backgroundUrl: undefined })]);

		const image = element.querySelector("img") as HTMLImageElement;
		expect(image.src).toContain("cover.jpg");
	});
});
