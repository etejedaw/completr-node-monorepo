import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type Game } from "../../../../core/models";
import { type CanonicalScore } from "../../../../shared/utils/canonical-score";
import { GameHero } from "./game-hero";

const noScore: CanonicalScore = {
	type: null,
	score: null,
	scoreScale: 5,
	duration: null,
	ratio: null
};

const baseGame = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [],
	times: [],
	dlcs: [],
	parentGame: null,
	externalLinks: []
} as Game;

describe("GameHero", () => {
	function render(
		game: Partial<Game> = {},
		inputs: Record<string, unknown> = {}
	) {
		const fixture = TestBed.createComponent(GameHero);
		fixture.componentRef.setInput("game", { ...baseGame, ...game });
		fixture.componentRef.setInput("score", inputs["score"] ?? noScore);
		for (const [name, value] of Object.entries(inputs)) {
			if (name !== "score") fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const toggled = vi.fn();
		fixture.componentInstance.franchiseTrackToggled.subscribe(toggled);
		return { element, toggled };
	}

	function badges(element: HTMLElement) {
		return Array.from(element.querySelectorAll("span")).map(s =>
			s.textContent?.trim()
		);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [GameHero],
			providers: [provideRouter([])]
		});
	});

	it("shows the title as the main heading and labels the section with it", () => {
		const { element } = render();

		expect(element.querySelector("h1")?.textContent?.trim()).toBe("Hades");
		expect(
			element.querySelector("section")?.getAttribute("aria-label")
		).toBe("Hades");
	});

	it("shows the release year, with the full date as tooltip, and the platforms", () => {
		const { element } = render({
			releaseAt: "2020-09-17",
			platforms: [
				{ id: "p1", name: "PC", code: "pc", abbreviation: "PC" },
				{
					id: "p2",
					name: "Switch",
					code: "switch",
					abbreviation: "NSW"
				}
			]
		});

		const year = element.querySelector("span.tabular-nums") as HTMLElement;
		expect(year.textContent?.trim()).toBe("2020");
		expect(year.title).toBe("2020-09-17");
		expect(element.textContent).toContain("PC, NSW");
	});

	it("omits the year and platforms when unknown", () => {
		const { element } = render();

		expect(element.querySelector("span.tabular-nums")).toBeNull();
		expect(element.textContent).not.toContain("•");
	});

	it("flags DLCs and compilations", () => {
		const dlc = render({ isDlc: true });
		const compilation = render({ isCompilation: true });
		const plain = render();

		expect(badges(dlc.element)).toContain("DLC");
		expect(badges(compilation.element)).toContain("Compilation");
		expect(badges(plain.element)).not.toContain("DLC");
		expect(badges(plain.element)).not.toContain("Compilation");
	});

	it("links at most three genres to the filtered catalog", () => {
		const { element } = render({
			genres: ["a", "b", "c", "d"].map(code => ({
				id: code,
				code,
				name: code.toUpperCase()
			}))
		});

		const links = Array.from(element.querySelectorAll("a")).filter(a =>
			a.getAttribute("href")?.startsWith("/games?")
		);
		expect(links.map(a => a.getAttribute("href"))).toEqual([
			"/games?genres=a",
			"/games?genres=b",
			"/games?genres=c"
		]);
	});

	it("links DLCs back to their parent game", () => {
		const { element } = render({
			parentGame: { id: "p", code: "base", title: "Base Game" }
		});

		const link = Array.from(element.querySelectorAll("a")).find(a =>
			a.textContent?.includes("DLC of")
		);
		expect(link?.getAttribute("href")).toBe("/games/base");
		expect(link?.textContent).toContain("DLC of Base Game");
	});

	describe("franchise", () => {
		const franchise = { id: "f1", name: "Zagreus Saga", code: "zagreus" };

		it("links to the franchise without a track button for guests", () => {
			const { element } = render({ franchise });

			const link = Array.from(element.querySelectorAll("a")).find(a =>
				a.textContent?.includes("Zagreus Saga")
			);
			expect(link?.getAttribute("href")).toBe("/franchises/zagreus");
			expect(element.querySelector("button")).toBeNull();
		});

		it("offers to track the franchise to logged in users", () => {
			const { element, toggled } = render(
				{ franchise },
				{ isLoggedIn: true }
			);

			const button = element.querySelector("button") as HTMLButtonElement;
			expect(button.textContent).toContain("Track");
			expect(button.getAttribute("aria-pressed")).toBe("false");
			button.click();
			expect(toggled).toHaveBeenCalledTimes(1);
		});

		it("shows the tracked state", () => {
			const { element } = render(
				{ franchise },
				{ isLoggedIn: true, franchiseTracked: true }
			);

			const button = element.querySelector("button") as HTMLButtonElement;
			expect(button.textContent).toContain("Tracking");
			expect(button.getAttribute("aria-pressed")).toBe("true");
		});

		it("disables the button while toggling", () => {
			const { element } = render(
				{ franchise },
				{ isLoggedIn: true, togglingFranchise: true }
			);

			expect(
				(element.querySelector("button") as HTMLButtonElement).disabled
			).toBe(true);
		});
	});

	describe("images", () => {
		it("uses the background as backdrop and the cover as poster", () => {
			const { element } = render({
				coverUrl: "https://img.test/cover.jpg",
				backgroundUrl: "https://img.test/background.jpg"
			});

			const sources = Array.from(element.querySelectorAll("img")).map(
				img => img.src
			);
			expect(
				sources.filter(s => s.includes("background.jpg"))
			).toHaveLength(2);
			expect(sources.filter(s => s.includes("cover.jpg"))).toHaveLength(
				1
			);
		});

		it("falls back to the other image when one is missing", () => {
			const onlyCover = render({
				coverUrl: "https://img.test/cover.jpg"
			});

			const sources = Array.from(
				onlyCover.element.querySelectorAll("img")
			).map(img => img.src);
			expect(sources).toHaveLength(3);
			expect(sources.every(s => s.includes("cover.jpg"))).toBe(true);
		});

		it("renders a plain backdrop and a placeholder poster without images", () => {
			const { element } = render();

			expect(element.querySelectorAll("img")).toHaveLength(0);
			expect(element.querySelector("[role='img']")).toBeTruthy();
		});
	});

	describe("score strip", () => {
		it("hides the ratio when there is none", () => {
			const { element } = render();

			expect(element.textContent).not.toContain("ratio");
		});

		it.each([
			["completr", "Completr ratio"],
			["aggregate", "Provisional ratio"],
			["rawg", "RAWG ratio"]
		] as const)("labels a %s ratio as %s", (type, label) => {
			const { element } = render(
				{},
				{ score: { ...noScore, type, ratio: 0.8 } }
			);

			expect(element.textContent).toContain(label);
			expect(element.textContent).toContain("0.8");
		});

		it("renders the extra facts with their unit and color", () => {
			const { element } = render(
				{},
				{
					facts: [
						{ label: "Time to beat", value: "22", unit: "h" },
						{
							label: "Metascore",
							value: "93",
							valueClass: "text-success"
						}
					]
				}
			);

			expect(element.textContent).toContain("Time to beat");
			expect(element.textContent).toContain("22h");
			const metascore = Array.from(
				element.querySelectorAll("span.tabular-nums")
			).find(s => s.textContent?.trim() === "93");
			expect(metascore?.className).toContain("text-success");
		});
	});
});
