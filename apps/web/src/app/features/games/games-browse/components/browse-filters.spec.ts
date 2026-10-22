import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type Genre, type Platform } from "../../../../core/models";
import { BrowseFilters } from "./browse-filters";

const genres: Genre[] = [
	{ id: "1", code: "rpg", name: "RPG" },
	{ id: "2", code: "action", name: "Action" }
];

const platforms: Platform[] = [
	{ id: "1", code: "pc", name: "PC", abbreviation: "PC" },
	{ id: "2", code: "switch", name: "Nintendo Switch", abbreviation: "NSW" }
];

@Component({
	imports: [BrowseFilters],
	template: `
		<app-browse-filters
			[allGenres]="allGenres()"
			[allPlatforms]="allPlatforms()"
			[activeCount]="activeCount()"
			[showClear]="showClear()"
			[(selectedGenres)]="selectedGenres"
			[(selectedPlatforms)]="selectedPlatforms"
			[(yearFrom)]="yearFrom"
			[(yearTo)]="yearTo"
			[(minScore)]="minScore"
			[(maxScore)]="maxScore"
			[(minDuration)]="minDuration"
			[(maxDuration)]="maxDuration"
			[(isDlc)]="isDlc"
			(cleared)="cleared()"
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	readonly allGenres = signal(genres);
	readonly allPlatforms = signal(platforms);
	readonly activeCount = signal(0);
	readonly showClear = signal(true);
	readonly selectedGenres = signal<Set<string>>(new Set());
	readonly selectedPlatforms = signal<Set<string>>(new Set());
	readonly yearFrom = signal<number | null>(null);
	readonly yearTo = signal<number | null>(null);
	readonly minScore = signal<number | null>(null);
	readonly maxScore = signal<number | null>(null);
	readonly minDuration = signal<number | null>(null);
	readonly maxDuration = signal<number | null>(null);
	readonly isDlc = signal<boolean | null>(null);
	readonly cleared = vi.fn();
}

describe("BrowseFilters", () => {
	async function renderFilters(setup?: (host: Host) => void) {
		const view = await render(Host);
		setup?.(view.fixture.componentInstance);
		view.detectChanges();
		return { host: view.fixture.componentInstance, view };
	}

	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("offers a chip per genre and platform", async () => {
		await renderFilters();

		expect(screen.getByRole("button", { name: "RPG" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Action" })
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "PC" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "NSW" })).toBeInTheDocument();
	});

	it("hides the genre and platform sections when the catalog has none", async () => {
		await renderFilters(host => {
			host.allGenres.set([]);
			host.allPlatforms.set([]);
		});

		expect(screen.queryByText("Genres")).not.toBeInTheDocument();
		expect(screen.queryByText("Platforms")).not.toBeInTheDocument();
		expect(screen.getByText("Release year")).toBeInTheDocument();
	});

	it("toggles genres and platforms through the two-way models", async () => {
		const { host } = await renderFilters();

		await userEvent.click(screen.getByRole("button", { name: "RPG" }));
		await userEvent.click(screen.getByRole("button", { name: "Action" }));
		await userEvent.click(screen.getByRole("button", { name: "NSW" }));

		expect([...host.selectedGenres()]).toEqual(["rpg", "action"]);
		expect([...host.selectedPlatforms()]).toEqual(["switch"]);
		await userEvent.click(screen.getByRole("button", { name: "RPG" }));
		expect([...host.selectedGenres()]).toEqual(["action"]);
	});

	it("reflects preselected chips as pressed", async () => {
		await renderFilters(host => host.selectedGenres.set(new Set(["rpg"])));

		expect(screen.getByRole("button", { name: "RPG" })).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute(
			"aria-pressed",
			"false"
		);
	});

	it("writes the release year range as numbers and clears it back to null", async () => {
		const { host } = await renderFilters();
		const from = screen.getByLabelText("Release year, From");
		const to = screen.getByLabelText("Release year, To");

		await userEvent.type(from, "1990");
		await userEvent.type(to, "2005");

		expect(host.yearFrom()).toBe(1990);
		expect(host.yearTo()).toBe(2005);
		await userEvent.clear(from);
		expect(host.yearFrom()).toBeNull();
	});

	it("writes the hours to beat range", async () => {
		const { host } = await renderFilters();

		await userEvent.type(
			screen.getByLabelText("Hours to beat, Min"),
			"2.5"
		);
		await userEvent.type(screen.getByLabelText("Hours to beat, Max"), "40");

		expect(host.minDuration()).toBe(2.5);
		expect(host.maxDuration()).toBe(40);
	});

	it("sets the minimum and maximum rating from the star sliders", async () => {
		const { host } = await renderFilters();
		const [minimum, maximum] = screen.getAllByRole("slider");

		minimum.focus();
		await userEvent.keyboard("{Home}");
		maximum.focus();
		await userEvent.keyboard("{End}");

		expect(host.minScore()).toBe(0.5);
		expect(host.maxScore()).toBe(5);
		maximum.focus();
		await userEvent.keyboard("{Backspace}");
		expect(host.maxScore()).toBeNull();
	});

	describe("game type", () => {
		function typeGroup() {
			return screen.getByRole("radiogroup", { name: "Game type" });
		}

		it("starts on All when no type filter is set", async () => {
			await renderFilters();

			expect(
				within(typeGroup()).getByRole("radio", { name: "All" })
			).toBeChecked();
		});

		it("maps Games to false and DLC to true and All back to null", async () => {
			const { host } = await renderFilters();

			await userEvent.click(
				within(typeGroup()).getByRole("radio", { name: "Games" })
			);
			expect(host.isDlc()).toBe(false);
			await userEvent.click(
				within(typeGroup()).getByRole("radio", { name: "DLC" })
			);
			expect(host.isDlc()).toBe(true);
			await userEvent.click(
				within(typeGroup()).getByRole("radio", { name: "All" })
			);
			expect(host.isDlc()).toBeNull();
		});

		it("selects the segment matching the current filter", async () => {
			await renderFilters(host => host.isDlc.set(false));

			expect(
				within(typeGroup()).getByRole("radio", { name: "Games" })
			).toBeChecked();
		});
	});

	describe("clear all", () => {
		it("is hidden when no filter is active", async () => {
			await renderFilters();

			expect(
				screen.queryByRole("button", { name: /Clear all filters/ })
			).not.toBeInTheDocument();
		});

		it("is hidden when showClear is off even with active filters", async () => {
			await renderFilters(host => {
				host.activeCount.set(2);
				host.showClear.set(false);
			});

			expect(
				screen.queryByRole("button", { name: /Clear all filters/ })
			).not.toBeInTheDocument();
		});

		it("emits cleared when filters are active", async () => {
			const { host } = await renderFilters(h => h.activeCount.set(2));

			await userEvent.click(
				screen.getByRole("button", { name: /Clear all filters/ })
			);

			expect(host.cleared).toHaveBeenCalledTimes(1);
		});
	});
});
