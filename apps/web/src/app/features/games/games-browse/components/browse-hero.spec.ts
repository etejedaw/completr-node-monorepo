import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type Game } from "../../../../core/models";
import { BrowseHero } from "./browse-hero";

const game = (id: string, overrides: Partial<Game> = {}) =>
	({
		id,
		code: id,
		title: `Game ${id}`,
		backgroundUrl: `https://img.test/${id}.jpg`,
		genres: [],
		...overrides
	}) as Game;

const ROTATION_MS = 7000;

describe("BrowseHero", () => {
	let reducedMotion: boolean;

	function render(games: Game[]) {
		const fixture = TestBed.createComponent(BrowseHero);
		fixture.componentRef.setInput("games", games);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const host = element;
		const tick = (ms: number) => {
			vi.advanceTimersByTime(ms);
			fixture.detectChanges();
		};
		return { fixture, element, host, tick };
	}

	function title(element: HTMLElement) {
		return element.querySelector("h1")?.textContent?.trim();
	}

	function button(element: HTMLElement, label: string) {
		return element.querySelector(
			`button[aria-label="${label}"]`
		) as HTMLButtonElement;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		reducedMotion = false;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				get matches() {
					return reducedMotion;
				},
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		TestBed.configureTestingModule({
			imports: [BrowseHero],
			providers: [provideRouter([])]
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("renders nothing without games", () => {
		const { element } = render([]);

		expect(element.querySelector("section")).toBeNull();
	});

	it("presents the first game as a carousel slide linking to it", () => {
		const { element } = render([game("a"), game("b")]);

		expect(title(element)).toBe("Game a");
		expect(
			element.querySelector("[role='group']")?.getAttribute("aria-label")
		).toBe("1 of 2: Game a");
		const links = Array.from(element.querySelectorAll("a")).map(a =>
			a.getAttribute("href")
		);
		expect(links).toContain("/games/a");
		expect(element.textContent).toContain("View game");
	});

	it("shows at most three genres linking to the filtered catalog", () => {
		const { element } = render([
			game("a", {
				genres: ["x", "y", "z", "w"].map(code => ({
					id: code,
					code,
					name: code.toUpperCase()
				}))
			})
		]);

		const hrefs = Array.from(element.querySelectorAll("a"))
			.map(a => a.getAttribute("href"))
			.filter(href => href?.startsWith("/games?"));
		expect(hrefs).toEqual([
			"/games?genres=x",
			"/games?genres=y",
			"/games?genres=z"
		]);
	});

	it("shows the ratio only when the game has one", () => {
		const withRatio = render([game("a", { ratio: 0.87 })]).element;
		const without = render([game("a")]).element;

		expect(withRatio.textContent).toContain("0.87");
		expect(without.textContent).not.toContain("Ratio");
	});

	it("hides the controls when there is a single game", () => {
		const { element } = render([game("a")]);

		expect(element.querySelectorAll("button")).toHaveLength(0);
	});

	it("loads only the first background eagerly and marks the active one visible", () => {
		const { element } = render([game("a"), game("b")]);

		const images = Array.from(element.querySelectorAll("img"));
		expect(images[0].getAttribute("fetchpriority")).toBe("high");
		expect(images[1].getAttribute("loading")).toBe("lazy");
		expect(images[0].className).toContain("opacity-80");
		expect(images[1].className).toContain("opacity-0");
	});

	describe("background images", () => {
		const RAWG = "https://media.rawg.io/media/";
		const rawgGames = () =>
			["a", "b", "c", "d"].map(id =>
				game(id, { backgroundUrl: `${RAWG}games/${id}.jpg` })
			);
		const sources = (element: HTMLElement) =>
			Array.from(element.querySelectorAll("img")).map(img => img.src);

		it("mounts only the active and the next background at the start", () => {
			const { element } = render(rawgGames());

			expect(sources(element)).toEqual([
				`${RAWG}resize/1280/-/games/a.jpg`,
				`${RAWG}resize/1280/-/games/b.jpg`
			]);
		});

		it("mounts the following background when advancing and keeps the seen ones", () => {
			const { fixture, element } = render(rawgGames());

			button(element, "Next featured game").click();
			fixture.detectChanges();
			expect(sources(element)).toEqual([
				`${RAWG}resize/1280/-/games/a.jpg`,
				`${RAWG}resize/1280/-/games/b.jpg`,
				`${RAWG}resize/1280/-/games/c.jpg`
			]);
			button(element, "Next featured game").click();
			fixture.detectChanges();
			expect(sources(element)).toHaveLength(4);
		});

		it("keeps the first background mounted after jumping with a dot", () => {
			const { fixture, element } = render(rawgGames());

			button(element, "Show Game c").click();
			fixture.detectChanges();

			expect(sources(element)).toEqual([
				`${RAWG}resize/1280/-/games/a.jpg`,
				`${RAWG}resize/1280/-/games/c.jpg`,
				`${RAWG}resize/1280/-/games/d.jpg`
			]);
			const images = Array.from(element.querySelectorAll("img"));
			expect(images[0].className).toContain("opacity-0");
			expect(images[1].className).toContain("opacity-80");
		});

		it("mounts the last background and skips the unseen ones when stepping back", () => {
			const { fixture, element } = render(rawgGames());

			button(element, "Previous featured game").click();
			fixture.detectChanges();

			expect(sources(element)).toEqual([
				`${RAWG}resize/1280/-/games/a.jpg`,
				`${RAWG}resize/1280/-/games/d.jpg`
			]);
		});
	});

	describe("navigation", () => {
		it("steps forward and wraps around to the first game", () => {
			const { fixture, element } = render([game("a"), game("b")]);

			button(element, "Next featured game").click();
			fixture.detectChanges();
			expect(title(element)).toBe("Game b");
			button(element, "Next featured game").click();
			fixture.detectChanges();
			expect(title(element)).toBe("Game a");
		});

		it("steps back and wraps around to the last game", () => {
			const { fixture, element } = render([
				game("a"),
				game("b"),
				game("c")
			]);

			button(element, "Previous featured game").click();
			fixture.detectChanges();

			expect(title(element)).toBe("Game c");
		});

		it("jumps to a game from its dot and marks it current", () => {
			const { fixture, element } = render([
				game("a"),
				game("b"),
				game("c")
			]);

			button(element, "Show Game c").click();
			fixture.detectChanges();

			expect(title(element)).toBe("Game c");
			expect(
				button(element, "Show Game c").getAttribute("aria-current")
			).toBe("true");
			expect(
				button(element, "Show Game a").getAttribute("aria-current")
			).toBe("false");
		});
	});

	describe("auto rotation", () => {
		it("advances to the next game every seven seconds", () => {
			const { element, tick } = render([game("a"), game("b")]);

			tick(ROTATION_MS - 1);
			expect(title(element)).toBe("Game a");
			tick(1);
			expect(title(element)).toBe("Game b");
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game a");
		});

		it("announces slides politely only when not rotating", () => {
			const { fixture, element } = render([game("a"), game("b")]);
			const live = () =>
				element
					.querySelector("[role='group']")
					?.getAttribute("aria-live");

			expect(live()).toBe("off");
			button(element, "Pause rotation").click();
			fixture.detectChanges();
			expect(live()).toBe("polite");
		});

		it("stops while paused and resumes after toggling again", () => {
			const { fixture, element, tick } = render([game("a"), game("b")]);

			button(element, "Pause rotation").click();
			fixture.detectChanges();
			tick(ROTATION_MS * 2);
			expect(title(element)).toBe("Game a");
			const resume = button(element, "Resume rotation");
			expect(resume.getAttribute("aria-pressed")).toBe("true");
			resume.click();
			fixture.detectChanges();
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game b");
		});

		it("pauses while hovered", () => {
			const { fixture, host, element, tick } = render([
				game("a"),
				game("b")
			]);

			host.dispatchEvent(new Event("mouseenter"));
			fixture.detectChanges();
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game a");
			host.dispatchEvent(new Event("mouseleave"));
			fixture.detectChanges();
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game b");
		});

		it("pauses while focus is inside", () => {
			const { fixture, host, element, tick } = render([
				game("a"),
				game("b")
			]);

			host.dispatchEvent(new Event("focusin"));
			fixture.detectChanges();
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game a");
			host.dispatchEvent(new Event("focusout"));
			fixture.detectChanges();
			tick(ROTATION_MS);
			expect(title(element)).toBe("Game b");
		});

		it("does not rotate when the user prefers reduced motion", () => {
			reducedMotion = true;
			const { element, tick } = render([game("a"), game("b")]);

			tick(ROTATION_MS * 3);

			expect(title(element)).toBe("Game a");
		});

		it("stops its timer when destroyed", () => {
			const { fixture } = render([game("a"), game("b")]);

			fixture.destroy();

			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
