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
			]
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
