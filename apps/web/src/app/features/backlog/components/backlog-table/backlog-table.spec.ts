import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type BacklogEntry, type BacklogStatus } from "../../../../core/models";
import { FavoritesService } from "../../../favorites/favorites";
import { BacklogTable } from "./backlog-table";

function entry(overrides: Partial<BacklogEntry> = {}): BacklogEntry {
	return {
		id: "b1",
		status: "playing",
		isPublic: true,
		score: 90,
		duration: 20,
		ratio: 4.5,
		realDuration: 25,
		personalRatio: 3.6,
		game: { id: "g1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "p1", abbreviation: "PC" },
		...overrides
	};
}

describe("BacklogTable", () => {
	const favoriteIds = new Set<string>();

	function render(
		entries: BacklogEntry[],
		inputs: Record<string, unknown> = {}
	) {
		const fixture = TestBed.createComponent(BacklogTable);
		fixture.componentRef.setInput("entries", entries);
		fixture.componentRef.setInput("sortBy", "title");
		fixture.componentRef.setInput("sortOrder", "asc");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const instance = fixture.componentInstance;
		const events = {
			sort: vi.fn(),
			open: vi.fn(),
			statusMenu: vi.fn(),
			statusSelect: vi.fn(),
			rate: vi.fn(),
			favorite: vi.fn(),
			queue: vi.fn()
		};
		instance.sortChange.subscribe(events.sort);
		instance.entryOpen.subscribe(events.open);
		instance.statusMenuToggle.subscribe(events.statusMenu);
		instance.statusSelect.subscribe(events.statusSelect);
		instance.quickRate.subscribe(events.rate);
		instance.favoriteToggle.subscribe(events.favorite);
		instance.queueToggle.subscribe(events.queue);
		return { fixture, element, events };
	}

	function headers(element: HTMLElement) {
		return Array.from(element.querySelectorAll("thead th"));
	}

	function header(element: HTMLElement, label: string) {
		return headers(element).find(th =>
			th.textContent?.trim().startsWith(label)
		) as HTMLElement;
	}

	function cells(element: HTMLElement) {
		return Array.from(element.querySelectorAll("tbody tr td"));
	}

	beforeEach(() => {
		favoriteIds.clear();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		TestBed.configureTestingModule({
			imports: [BacklogTable],
			providers: [
				provideRouter([]),
				{
					provide: FavoritesService,
					useValue: {
						isFavorite: (id: string) => favoriteIds.has(id)
					}
				}
			]
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("columns and sorting", () => {
		it("renders the sortable columns plus favorite and queue columns", () => {
			const { element } = render([], { sortBy: "none" });

			expect(headers(element).map(th => th.textContent?.trim())).toEqual([
				"Title",
				"Platform",
				"Score",
				"Duration",
				"Ratio",
				"Real",
				"Your run",
				"Rating",
				"Finished",
				"Status",
				"Favorite",
				"Up Next"
			]);
		});

		it("drops the favorite and queue columns when readonly", () => {
			const { element } = render([], { readonly: true });

			expect(headers(element)).toHaveLength(10);
		});

		it("marks only the active column with aria-sort and an arrow", () => {
			const { element } = render([], {
				sortBy: "ratio",
				sortOrder: "desc"
			});

			expect(header(element, "Ratio").getAttribute("aria-sort")).toBe(
				"descending"
			);
			expect(header(element, "Ratio").textContent).toContain(
				"arrow_downward"
			);
			expect(header(element, "Title").getAttribute("aria-sort")).toBe(
				"none"
			);
		});

		it("reports ascending order", () => {
			const { element } = render([], {
				sortBy: "score",
				sortOrder: "asc"
			});

			expect(header(element, "Score").getAttribute("aria-sort")).toBe(
				"ascending"
			);
			expect(header(element, "Score").textContent).toContain(
				"arrow_upward"
			);
		});

		it("leaves the platform column unsortable", () => {
			const { element, events } = render([]);

			header(element, "Platform").click();

			expect(events.sort).not.toHaveBeenCalled();
			expect(header(element, "Platform").hasAttribute("aria-sort")).toBe(
				false
			);
		});

		it("emits the sort key on click, Enter and Space", () => {
			const { element, events } = render([]);
			const duration = header(element, "Duration");

			duration.click();
			duration.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
			);
			const space = new KeyboardEvent("keydown", {
				key: " ",
				cancelable: true
			});
			duration.dispatchEvent(space);

			expect(events.sort).toHaveBeenCalledTimes(3);
			expect(events.sort).toHaveBeenCalledWith("duration");
		});

		it("explains the personal ratio column with a tooltip", () => {
			const { element } = render([]);

			expect(header(element, "Your run").title).toBe(
				"Score per hour you actually played"
			);
		});
	});

	describe("row content", () => {
		it("shows the metrics of an entry", () => {
			const { element } = render([entry()]);

			const text = cells(element).map(td => td.textContent?.trim());
			expect(text).toContain("PC");
			expect(text).toContain("90");
			expect(text).toContain("20h");
			expect(text).toContain("4.5");
			expect(text).toContain("25h");
			expect(text).toContain("3.6");
		});

		it("shows placeholders for missing metrics", () => {
			const { element } = render([
				entry({
					score: undefined,
					duration: undefined,
					ratio: undefined,
					realDuration: undefined,
					personalRatio: undefined,
					finishedAt: undefined
				})
			]);

			const text = cells(element).map(td => td.textContent?.trim());
			expect(text.filter(t => t === "-")).toHaveLength(5);
			expect(text).toContain("—");
		});

		it("formats the finished date", () => {
			const { element } = render([
				entry({ finishedAt: "2026-03-05T12:00:00Z" })
			]);

			expect(
				cells(element).some(
					td => td.textContent?.trim() === "2026-03-05"
				)
			).toBe(true);
		});

		it("shows the compilation the game belongs to", () => {
			const { element } = render([
				entry({
					compilationGame: {
						id: "c1",
						code: "c",
						title: "Collection"
					}
				})
			]);

			expect(element.textContent).toContain("Collection");
		});

		it.each<[BacklogStatus, boolean]>([
			["playing", true],
			["endless", true],
			["not_started", true],
			["completed", false],
			["abandoned", false]
		])("shows the latest progress note for %s: %s", (status, visible) => {
			const { element } = render([
				entry({
					status,
					latestProgress: { note: "At the boss", createdAt: "" }
				})
			]);

			expect(element.textContent?.includes("At the boss")).toBe(visible);
		});

		it("shows three co-op avatars and a counter for the rest", () => {
			const members = Array.from({ length: 5 }, (_, i) => ({
				userId: `u${i}`,
				username: `user${i}`,
				name: `User ${i}`,
				avatarUrl: null,
				backlogId: `b${i}`
			}));

			const { element } = render([entry({ coopMembers: members })]);

			expect(element.querySelectorAll("ui-avatar")).toHaveLength(3);
			expect(element.textContent).toContain("+2");
		});
	});

	describe("opening entries", () => {
		it("emits entryOpen with the entry when a row is clicked", () => {
			const row = entry();
			const { element, events } = render([row]);

			(element.querySelector("tbody tr") as HTMLElement).click();

			expect(events.open).toHaveBeenCalledTimes(1);
			expect(events.open.mock.calls[0][0].entry).toBe(row);
		});

		it("does not open entries when readonly", () => {
			const { element, events } = render([entry()], { readonly: true });

			(element.querySelector("tbody tr") as HTMLElement).click();

			expect(events.open).not.toHaveBeenCalled();
		});
	});

	describe("status", () => {
		function statusButton(element: HTMLElement) {
			return element.querySelector(
				"button[aria-haspopup='menu']"
			) as HTMLButtonElement | null;
		}

		it.each<[BacklogStatus, boolean]>([
			["not_started", true],
			["playing", true],
			["endless", true],
			["completed", false],
			["abandoned", false]
		])("%s status is changeable: %s", (status, changeable) => {
			const { element } = render([entry({ status })]);

			expect(statusButton(element) !== null).toBe(changeable);
		});

		it("shows a static badge when readonly", () => {
			const { element } = render([entry()], { readonly: true });

			expect(statusButton(element)).toBeNull();
			expect(element.textContent).toContain("Playing");
		});

		it("emits statusMenuToggle when the badge is clicked", () => {
			const row = entry();
			const { element, events } = render([row]);

			statusButton(element)!.click();

			expect(events.statusMenu.mock.calls[0][0].entry).toBe(row);
		});

		it("disables the badge while the status is updating", () => {
			const { element } = render([entry()], {
				updatingStatusIds: new Set(["b1"])
			});

			expect(statusButton(element)!.disabled).toBe(true);
		});

		it("opens the menu for the selected entry and lists every status", () => {
			const { element } = render([entry()], {
				statusMenuOpenId: "b1"
			});

			expect(statusButton(element)!.getAttribute("aria-expanded")).toBe(
				"true"
			);
			const items = Array.from(
				element.querySelectorAll("[role='menuitem']")
			) as HTMLButtonElement[];
			expect(items).toHaveLength(5);
			expect(items.find(i => i.disabled)?.textContent).toContain(
				"Playing"
			);
		});

		it("emits the chosen status from the menu", () => {
			const row = entry();
			const { element, events } = render([row], {
				statusMenuOpenId: "b1"
			});

			const completed = Array.from(
				element.querySelectorAll<HTMLButtonElement>("[role='menuitem']")
			).find(i => i.textContent?.includes("Completed"))!;
			completed.click();

			expect(events.statusSelect).toHaveBeenCalledTimes(1);
			expect(events.statusSelect.mock.calls[0][0]).toMatchObject({
				entry: row,
				status: "completed"
			});
			expect(events.open).not.toHaveBeenCalled();
		});

		it("closes the menu with Escape", () => {
			const { fixture, element } = render([entry()], {
				statusMenuOpenId: "b1"
			});

			element
				.querySelector("[role='menu']")!
				.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
			fixture.detectChanges();

			expect(element.querySelector("[role='menu']")).toBeNull();
		});
	});

	describe("quick rating", () => {
		function stars(element: HTMLElement) {
			return element.querySelector("app-star-rating") as HTMLElement;
		}

		it("is allowed for a started entry without rating", () => {
			const row = entry();
			const { element, events } = render([row]);

			stars(element).querySelectorAll("button")[1].click();

			expect(events.rate).toHaveBeenCalledWith({ entry: row, rating: 1 });
		});

		it("is not allowed for an entry that has not started", () => {
			const { element } = render([entry({ status: "not_started" })]);

			expect(stars(element).querySelector("button")).toBeNull();
		});

		it("is not allowed once the entry has a rating", () => {
			const { element } = render([entry({ userRating: 4 })]);

			expect(stars(element).querySelector("button")).toBeNull();
		});

		it("is not allowed when readonly", () => {
			const { element } = render([entry()], { readonly: true });

			expect(stars(element).querySelector("button")).toBeNull();
		});
	});

	describe("favorite and queue toggles", () => {
		function rowButton(element: HTMLElement, label: RegExp) {
			return Array.from(
				element.querySelectorAll<HTMLButtonElement>("tbody button")
			).find(b => label.test(b.getAttribute("aria-label") ?? ""))!;
		}

		it("reflects whether the game is a favorite", () => {
			favoriteIds.add("g1");
			const { element } = render([entry()]);

			expect(rowButton(element, /favorites/).title).toBe(
				"Remove from favorites"
			);
		});

		it("offers adding to favorites for a non favorite and emits the game id", () => {
			const { element, events } = render([entry()]);

			const button = rowButton(element, /favorites/);
			button.click();

			expect(button.title).toBe("Add to favorites");
			expect(events.favorite.mock.calls[0][0].gameId).toBe("g1");
		});

		it("reflects queue membership and emits the entry without opening the row", () => {
			const row = entry();
			const { element, events } = render([row], {
				queuedBacklogIds: new Set(["b1"])
			});

			const button = rowButton(element, /Queue/);
			expect(button.title).toBe("Remove from Queue");
			button.click();

			expect(events.queue).toHaveBeenCalledWith(row);
			expect(events.open).not.toHaveBeenCalled();
		});

		it("offers adding to the queue when the entry is not queued", () => {
			const { element } = render([entry()]);

			expect(rowButton(element, /Queue/).title).toBe("Add to Queue");
		});
	});
});
