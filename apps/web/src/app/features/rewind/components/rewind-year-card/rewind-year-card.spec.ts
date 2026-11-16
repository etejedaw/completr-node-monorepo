import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import {
	type RewindLanguage,
	type RewindYearSummary
} from "../../../../core/models/rewind.model";
import { RewindYearCard } from "./rewind-year-card";

const BACKGROUND_URL = "https://img.example/a-background.jpg";
const COVER_URL = "https://img.example/a-cover.jpg";

const cover = (id: string) => ({
	gameId: id,
	code: id,
	title: `Game ${id}`,
	coverUrl: id === "a" ? COVER_URL : null,
	backgroundUrl: id === "a" ? BACKGROUND_URL : null
});

function summary(
	overrides: Partial<RewindYearSummary> = {}
): RewindYearSummary {
	return {
		isGenerated: true,
		generationBlockedBy: null,
		canWriteAiRecap: true,
		year: 2025,
		finishedCount: 18,
		startedCount: 23,
		hoursPlayed: 212.5,
		persona: "trophy-hunter" as const,
		covers: ["a", "b", "c", "d", "e"].map(cover),
		...overrides
	};
}

function firstCoverWith(urls: {
	coverUrl: string | null;
	backgroundUrl: string | null;
}) {
	return [{ ...cover("a"), ...urls }, cover("b")];
}

function art(element: HTMLElement) {
	return element.querySelector<HTMLImageElement>("[data-cartridge-art]");
}

function placeholder(element: HTMLElement) {
	return element.querySelector("[data-cartridge-placeholder]");
}

describe("RewindYearCard", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
	});

	function mount(value: RewindYearSummary, language?: RewindLanguage) {
		const fixture = TestBed.createComponent(RewindYearCard);
		fixture.componentRef.setInput("username", "ada");
		fixture.componentRef.setInput("summary", value);
		if (language) fixture.componentRef.setInput("language", language);
		fixture.detectChanges();
		return fixture;
	}

	function render(value: RewindYearSummary, language?: RewindLanguage) {
		return mount(value, language).nativeElement as HTMLElement;
	}

	function breakArt(fixture: ReturnType<typeof mount>, element: HTMLElement) {
		art(element)!.dispatchEvent(new Event("error"));
		fixture.detectChanges();
	}

	describe("a generated year", () => {
		it("is a cartridge link to the year with its counts and hours", () => {
			const element = render(summary());
			const link = element.querySelector("a")!;

			expect(link.getAttribute("href")).toBe("/user/ada/rewind/2025");
			expect(link.hasAttribute("data-cartridge")).toBe(true);
			expect(link.textContent).toContain("2025");
			expect(link.textContent).toContain("18 finished · 212.5 h");
			expect(element.querySelector("button")).toBeNull();
		});

		it("puts the first game's background on the label as decorative art", () => {
			const image = art(render(summary()))!;

			expect(image.getAttribute("src")).toBe(BACKGROUND_URL);
			expect(image.getAttribute("alt")).toBe("");
			expect(image.getAttribute("loading")).toBe("lazy");
			expect(placeholder(render(summary()))).toBeNull();
		});

		it("asks RAWG for a resized copy of the art", () => {
			const rawgUrl =
				"https://media.rawg.io/media/games/abc/background.jpg";
			const image = art(
				render(
					summary({
						covers: firstCoverWith({
							coverUrl: null,
							backgroundUrl: rawgUrl
						})
					})
				)
			)!;

			expect(image.getAttribute("src")).toBe(
				"https://media.rawg.io/media/resize/640/-/games/abc/background.jpg"
			);
		});

		it("falls back to the cover and then to the placeholder when the art breaks", () => {
			const fixture = mount(summary());
			const element = fixture.nativeElement as HTMLElement;

			breakArt(fixture, element);
			expect(art(element)!.getAttribute("src")).toBe(COVER_URL);

			breakArt(fixture, element);
			expect(art(element)).toBeNull();
			expect(placeholder(element)?.textContent?.trim()).toBe("?");
			expect(element.querySelector("a")!.textContent).toContain(
				"Trophy Hunter"
			);
		});

		it("uses the cover when the game has no background", () => {
			const image = art(
				render(
					summary({
						covers: firstCoverWith({
							coverUrl: COVER_URL,
							backgroundUrl: null
						})
					})
				)
			)!;

			expect(image.getAttribute("src")).toBe(COVER_URL);
		});

		it("does not retry the same broken url when background and cover match", () => {
			const fixture = mount(
				summary({
					covers: firstCoverWith({
						coverUrl: COVER_URL,
						backgroundUrl: COVER_URL
					})
				})
			);
			const element = fixture.nativeElement as HTMLElement;

			breakArt(fixture, element);

			expect(art(element)).toBeNull();
			expect(placeholder(element)).not.toBeNull();
		});

		it("shows the placeholder for a year without covers or with empty urls", () => {
			expect(art(render(summary({ covers: [] })))).toBeNull();
			expect(placeholder(render(summary({ covers: [] })))).not.toBeNull();

			const blank = render(
				summary({
					covers: firstCoverWith({ coverUrl: "", backgroundUrl: "" })
				})
			);
			expect(art(blank)).toBeNull();
			expect(placeholder(blank)).not.toBeNull();
		});

		it("gives the art another chance when the card receives a different year", () => {
			const fixture = mount(summary());
			const element = fixture.nativeElement as HTMLElement;
			breakArt(fixture, element);
			breakArt(fixture, element);
			expect(art(element)).toBeNull();

			fixture.componentRef.setInput(
				"summary",
				summary({
					year: 2024,
					covers: firstCoverWith({
						coverUrl: "https://img.example/2024.jpg",
						backgroundUrl: null
					})
				})
			);
			fixture.detectChanges();

			expect(art(element)!.getAttribute("src")).toBe(
				"https://img.example/2024.jpg"
			);
		});

		it("shows the year's persona and paints the label with the year's colour", () => {
			const element = render(summary({ year: 2025 }));
			const link = element.querySelector("a")!;

			expect(link.textContent).toContain("Trophy Hunter");
			expect(link.textContent).not.toContain("you emptied them");
			expect(link.style.getPropertyValue("--tone")).toBe(
				"var(--color-nav-lists)"
			);
		});

		it("gives consecutive years different colours", () => {
			const tones = [2024, 2025, 2026].map(year =>
				render(summary({ year }))
					.querySelector("a")!
					.style.getPropertyValue("--tone")
			);

			expect(new Set(tones).size).toBe(3);
		});

		it("falls back to the started count and hides hours that were never played", () => {
			const element = render(
				summary({ finishedCount: 0, hoursPlayed: 0, covers: [] })
			);

			expect(element.textContent).toContain("23 started");
			expect(element.textContent).not.toContain(" h");
			expect(element.querySelector("app-game-poster")).toBeNull();
		});

		it("ignores a block on a year that is already generated", () => {
			const element = render(
				summary({
					isGenerated: true,
					generationBlockedBy: "period-closed"
				})
			);

			expect(element.querySelector("a")?.getAttribute("href")).toBe(
				"/user/ada/rewind/2025"
			);
			expect(element.textContent).not.toContain("Can't be generated now");
		});
	});

	describe("an ungenerated year of the owner", () => {
		it("is a Generate cartridge without spoilers", () => {
			const element = render(summary({ isGenerated: false }));
			const button = element.querySelector("button")!;

			expect(element.querySelector("a")).toBeNull();
			expect(button.getAttribute("type")).toBe("button");
			expect(button.getAttribute("aria-label")).toBe(
				"Generate your 2025 Rewind"
			);
			expect(button.textContent).toContain("2025");
			expect(button.textContent).toContain("Ready to rewind");
			expect(button.textContent).toContain("Generate");
			expect(button.textContent).not.toContain("Trophy Hunter");
			expect(button.textContent).not.toContain("18 finished");
			expect(button.textContent).not.toContain("212.5");
			expect(art(element)).toBeNull();
			expect(placeholder(element)?.textContent?.trim()).toBe("?");
			expect(element.querySelector("app-rewind-persona-rank")).toBeNull();
		});

		describe("with the generator", () => {
			beforeEach(() => {
				vi.stubGlobal(
					"matchMedia",
					vi.fn(() => ({
						matches: false,
						addEventListener: vi.fn(),
						removeEventListener: vi.fn()
					}))
				);
			});

			afterEach(() => {
				vi.unstubAllGlobals();
			});

			function openGenerator(
				overrides: Partial<RewindYearSummary>,
				clicks: number
			) {
				const fixture = TestBed.createComponent(RewindYearCard);
				fixture.componentRef.setInput("username", "ada");
				fixture.componentRef.setInput(
					"summary",
					summary({ isGenerated: false, ...overrides })
				);
				fixture.componentRef.setInput("premiumAccess", {
					allowed: true,
					source: "role",
					expiresAt: null
				});
				fixture.detectChanges();
				const button = (
					fixture.nativeElement as HTMLElement
				).querySelector("button")!;
				for (let click = 0; click < clicks; click++) button.click();
				fixture.detectChanges();
				return fixture;
			}

			it("opens the generator with Write my AI recap locked off when the year has no AI generations left", async () => {
				const fixture = openGenerator({ canWriteAiRecap: false }, 1);
				await fixture.whenStable();

				const writeSwitch = document.querySelector(
					'[role="switch"][aria-label="Write my AI recap"]'
				);
				expect(writeSwitch?.getAttribute("aria-checked")).toBe("false");
				expect(writeSwitch?.hasAttribute("disabled")).toBe(true);
				expect(document.body.textContent).toContain(
					"No AI generations left for 2025."
				);
				fixture.destroy();
			});

			it("opens a single generator when Generate is clicked twice", async () => {
				const fixture = openGenerator({}, 2);
				await fixture.whenStable();

				expect(
					(fixture.nativeElement as HTMLElement).querySelectorAll(
						"app-rewind-generate-dialog"
					)
				).toHaveLength(1);
				fixture.destroy();
			});
		});
	});

	describe("a blocked year", () => {
		it("replaces Generate with the reason and shows no art or persona", () => {
			const element = render(
				summary({
					isGenerated: false,
					generationBlockedBy: "requires-premium"
				})
			);

			expect(element.querySelector("button")).toBeNull();
			expect(element.querySelector("a")).toBeNull();
			expect(element.querySelector("[data-cartridge]")).not.toBeNull();
			expect(element.textContent).toContain("2025");
			expect(element.textContent).toContain("Can't be generated now");
			expect(element.textContent).toContain(
				"Rewinds of previous years can only be generated with Premium."
			);
			expect(art(element)).toBeNull();
			expect(placeholder(element)).not.toBeNull();
			expect(element.textContent).not.toContain("Trophy Hunter");
		});

		it("tells when generation opens for a closed year in Spanish", () => {
			const fixture = TestBed.createComponent(RewindYearCard);
			fixture.componentRef.setInput("username", "ada");
			fixture.componentRef.setInput(
				"summary",
				summary({
					isGenerated: false,
					generationBlockedBy: "period-closed"
				})
			);
			fixture.componentRef.setInput("period", {
				status: "scheduled",
				year: 2026,
				opensAt: "2026-12-01",
				closesAt: "2027-01-31"
			});
			fixture.componentRef.setInput("language", "es");
			fixture.detectChanges();
			const element = fixture.nativeElement as HTMLElement;

			expect(element.querySelector("button")).toBeNull();
			expect(element.textContent).toContain("No se puede generar ahora");
			expect(element.textContent).toContain(
				"La generación de Rewinds abre el 1 de diciembre de 2026."
			);
		});
	});

	it("speaks Spanish on the Spanish Rewind page", () => {
		const generated = render(summary(), "es");
		expect(generated.querySelector("a")!.textContent).toContain(
			"18 terminados · 212,5 h"
		);

		const started = render(
			summary({ finishedCount: 0, startedCount: 1, hoursPlayed: 3 }),
			"es"
		);
		expect(started.querySelector("a")!.textContent).toContain(
			"1 empezado · 3 h"
		);

		const pending = render(summary({ isGenerated: false }), "es");
		const button = pending.querySelector("button")!;
		expect(button.getAttribute("aria-label")).toBe(
			"Generar tu Rewind 2025"
		);
		expect(button.textContent).toContain("Listo para rebobinar");
		expect(button.textContent).toContain("Generar");
		expect(button.textContent).not.toContain("Generate");
	});
});
