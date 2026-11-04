import { TestBed } from "@angular/core/testing";

import { type Game } from "../../../core/models";
import { GameSearchStep } from "./game-search-step";

function game(overrides: Partial<Game> = {}): Game {
	return {
		id: "1",
		title: "Hades",
		code: "hades",
		isDlc: false,
		platforms: [],
		genres: [],
		scores: [],
		times: [],
		dlcs: [],
		parentGame: null,
		externalLinks: [],
		...overrides
	};
}

describe("GameSearchStep", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(GameSearchStep);
		fixture.componentRef.setInput("results", []);
		fixture.componentRef.setInput("status", "done");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function root(fixture: ReturnType<typeof render>) {
		return fixture.nativeElement as HTMLElement;
	}

	function button(fixture: ReturnType<typeof render>, name: RegExp) {
		return Array.from(root(fixture).querySelectorAll("button")).find(b =>
			name.test(b.textContent ?? "")
		) as HTMLButtonElement;
	}

	it("asks for at least 2 characters while idle", () => {
		const fixture = render({ status: "idle" });

		expect(root(fixture).textContent).toContain(
			"Type at least 2 characters to search."
		);
	});

	it("shows skeleton rows while searching", () => {
		const fixture = render({ status: "searching" });

		expect(
			root(fixture).querySelector('[role="status"]')?.textContent
		).toContain("Searching…");
		expect(
			root(fixture).querySelectorAll("ui-skeleton").length
		).toBeGreaterThan(0);
	});

	it("announces the online search while searching online", () => {
		const fixture = render({ status: "searchingOnline" });

		expect(root(fixture).textContent).toContain("Searching online");
	});

	it("renders each result with title, year and badges", () => {
		const fixture = render({
			results: [
				game({ releaseAt: "2020-09-17" }),
				game({
					id: "2",
					title: "Hades DLC",
					isDlc: true,
					justImported: true
				})
			],
			onlineSearchSource: "rawg"
		});
		const rows = root(fixture).querySelectorAll("li");

		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain("2020");
		expect(rows[0].textContent).not.toContain("DLC");
		expect(rows[1].textContent).toContain("DLC");
		expect(rows[1].textContent).toContain("RAWG");
		expect(
			root(fixture).querySelector('p.sr-only[role="status"]')?.textContent
		).toContain("2 games found");
	});

	it("uses the singular count for one result", () => {
		const fixture = render({ results: [game()] });

		expect(
			root(fixture).querySelector('p.sr-only[role="status"]')?.textContent
		).toContain("1 game found");
	});

	it("explains that the online search is unavailable instead of saying nothing was found", () => {
		const fixture = render({ onlineSearchUnavailable: true });
		const searchOnline = vi.fn();
		fixture.componentInstance.searchOnline.subscribe(searchOnline);

		const notice = root(fixture).querySelector('[role="status"]');
		expect(notice?.textContent).toContain("Online search is unavailable");
		expect(notice?.textContent).toContain(
			"This game isn't in Completr yet and the online search (RAWG and IGDB) isn't responding right now. Try again in a few minutes."
		);
		expect(notice?.textContent).not.toContain("No games found");
		button(fixture, /Try again/).click();

		expect(searchOnline).toHaveBeenCalledOnce();
	});

	it("disables the retry while the online search is running", () => {
		const fixture = render({
			onlineSearchUnavailable: true,
			onlineSearching: true
		});

		expect(button(fixture, /Searching online/).disabled).toBe(true);
	});

	it("keeps the usual empty state while the online search is available", () => {
		const fixture = render({ onlineSearchUnavailable: false });

		expect(root(fixture).textContent).toContain("No games found");
		expect(root(fixture).textContent).not.toContain(
			"Online search is unavailable"
		);
	});

	it("shows no IGDB note when RAWG answered or nothing online was searched", () => {
		const withRawg = render({
			results: [game()],
			onlineSearchSource: "rawg"
		});
		const withoutSource = render({ results: [game()] });

		expect(root(withRawg).textContent).not.toContain("RAWG is down");
		expect(root(withoutSource).textContent).not.toContain("RAWG is down");
	});

	it("notes above the results that RAWG is down when IGDB answered", () => {
		const fixture = render({
			results: [game({ justImported: true })],
			onlineSearchSource: "igdb"
		});

		const note = Array.from(
			root(fixture).querySelectorAll('p[role="status"]')
		).find(p => p.textContent?.includes("RAWG is down"));
		expect(note?.textContent).toContain(
			"RAWG is down, showing results from IGDB"
		);
		const list = root(fixture).querySelector("ul");
		expect(
			(note as Node).compareDocumentPosition(list as Node) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("notes that RAWG is down above No games found when IGDB found nothing", () => {
		const fixture = render({ onlineSearchSource: "igdb" });

		const text = root(fixture).textContent ?? "";
		expect(text).toContain("RAWG is down, showing results from IGDB");
		expect(text).toContain("No games found");
		expect(text.indexOf("RAWG is down")).toBeLessThan(
			text.indexOf("No games found")
		);
		expect(text).not.toContain("Online search is unavailable");
	});

	it.each([
		["rawg", "RAWG"],
		["igdb", "IGDB"]
	])("labels a just imported game after the %s source", (source, label) => {
		const fixture = render({
			results: [game({ justImported: true })],
			onlineSearchSource: source
		});

		const badge = root(fixture).querySelector(
			`[title="Just imported from ${label}"]`
		);
		expect(badge?.textContent).toContain(label);
	});

	it("stops showing the IGDB note once the source goes away", () => {
		const fixture = render({
			results: [game()],
			onlineSearchSource: "igdb"
		});
		expect(root(fixture).textContent).toContain("RAWG is down");

		fixture.componentRef.setInput("onlineSearchSource", undefined);
		fixture.detectChanges();

		expect(root(fixture).textContent).not.toContain("RAWG is down");
	});

	it("moves from the unavailable notice to the IGDB results after a retry", () => {
		const fixture = render({ onlineSearchUnavailable: true });
		expect(root(fixture).textContent).toContain(
			"Online search is unavailable"
		);

		fixture.componentRef.setInput("onlineSearchUnavailable", false);
		fixture.componentRef.setInput("onlineSearchSource", "igdb");
		fixture.componentRef.setInput("results", [
			game({ justImported: true })
		]);
		fixture.detectChanges();

		expect(root(fixture).textContent).not.toContain(
			"Online search is unavailable"
		);
		expect(root(fixture).textContent).toContain(
			"RAWG is down, showing results from IGDB"
		);
		expect(root(fixture).textContent).toContain("IGDB");
	});

	it("emits searchOnline on every click of Try again so the owner can ignore repeats", () => {
		const fixture = render({ onlineSearchUnavailable: true });
		const searchOnline = vi.fn();
		fixture.componentInstance.searchOnline.subscribe(searchOnline);

		button(fixture, /Try again/).click();
		fixture.componentRef.setInput("onlineSearching", true);
		fixture.detectChanges();
		button(fixture, /Searching online/).click();

		expect(searchOnline).toHaveBeenCalledTimes(1);
	});

	it("emits picked with the selected game", () => {
		const fixture = render({
			results: [game(), game({ id: "2", title: "Celeste" })]
		});
		const picked = vi.fn();
		fixture.componentInstance.picked.subscribe(picked);

		(
			root(fixture).querySelector(
				'[aria-label="Select Celeste"]'
			) as HTMLButtonElement
		).click();

		expect(picked).toHaveBeenCalledWith(
			expect.objectContaining({ id: "2" })
		);
	});

	it("offers an online search with the typed query when there are results", () => {
		const fixture = render({ results: [game()], query: " zelda " });
		const searchOnline = vi.fn();
		fixture.componentInstance.searchOnline.subscribe(searchOnline);

		const online = button(fixture, /Not here/);
		expect(online.textContent).toContain("“zelda”");
		online.click();

		expect(searchOnline).toHaveBeenCalledOnce();
	});

	it("hides the online search when it is not allowed", () => {
		const fixture = render({ results: [game()], allowOnline: false });

		expect(button(fixture, /Not here/)).toBeUndefined();
	});

	it("disables the online search while it is running", () => {
		const fixture = render({ results: [game()], onlineSearching: true });

		const online = button(fixture, /Searching online/);
		expect(online.disabled).toBe(true);
	});

	describe("without results", () => {
		it("shows the empty state with the hint", () => {
			const fixture = render({ emptyHint: "Try Hades" });

			expect(root(fixture).textContent).toContain("No games found");
			expect(root(fixture).textContent).toContain("Try Hades");
		});

		it("emits searchOnline from the empty state button", () => {
			const fixture = render();
			const searchOnline = vi.fn();
			fixture.componentInstance.searchOnline.subscribe(searchOnline);

			button(fixture, /Search online/).click();

			expect(searchOnline).toHaveBeenCalledOnce();
		});

		it("omits the online button when it is not allowed", () => {
			const fixture = render({ allowOnline: false });

			expect(root(fixture).querySelector("button")).toBeNull();
		});
	});

	it("focuses the search input when autofocus is on", async () => {
		const fixture = render({ autofocus: true });
		await fixture.whenStable();

		expect(document.activeElement).toBe(
			root(fixture).querySelector("input")
		);
	});

	it("uses the custom placeholder in the search bar", () => {
		const fixture = render({ placeholder: "Find a game..." });

		expect(root(fixture).querySelector("input")?.placeholder).toBe(
			"Find a game..."
		);
	});
});
