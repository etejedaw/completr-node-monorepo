import { TestBed } from "@angular/core/testing";

import { type BacklogEntry } from "../../../../core/models";
import { GameRuns } from "./game-runs";

const run = (overrides: Partial<BacklogEntry>) =>
	({
		id: "r1",
		status: "not_started",
		platform: { id: "p1", abbreviation: "PC" },
		startedAt: null,
		finishedAt: null,
		realDuration: null,
		userRating: null,
		latestProgress: null,
		...overrides
	}) as unknown as BacklogEntry;

describe("GameRuns", () => {
	function render(runs: BacklogEntry[]) {
		const fixture = TestBed.createComponent(GameRuns);
		fixture.componentRef.setInput("runs", runs);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const events = { opened: vi.fn(), added: vi.fn() };
		fixture.componentInstance.runOpened.subscribe(events.opened);
		fixture.componentInstance.runAdded.subscribe(events.added);
		return { element, events };
	}

	function summary(element: HTMLElement) {
		return Array.from(element.querySelectorAll("dl > div")).map(div => ({
			label: div.querySelector("dt")?.textContent?.trim(),
			value: div.querySelector("dd")?.textContent?.replace(/\s+/g, "")
		}));
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [GameRuns] });
	});

	it("summarises the runs, the completed ones and the hours played", () => {
		const { element } = render([
			run({ id: "1", status: "completed", realDuration: 10 }),
			run({ id: "2", status: "playing", realDuration: 2.5 }),
			run({ id: "3", status: "completed" })
		]);

		expect(summary(element)).toEqual([
			{ label: "Runs", value: "3" },
			{ label: "Completed", value: "2" },
			{ label: "Played", value: "12.5h" }
		]);
	});

	it("shows zeros when there are no runs", () => {
		const { element } = render([]);

		expect(summary(element).map(s => s.value)).toEqual(["0", "0", "0h"]);
		expect(element.querySelectorAll("ol li")).toHaveLength(0);
	});

	it("numbers the runs from the newest down and describes each one", () => {
		const { element } = render([
			run({ id: "3", status: "playing" }),
			run({ id: "2", status: "completed" }),
			run({ id: "1", status: "abandoned" })
		]);

		const labels = Array.from(element.querySelectorAll("ol button")).map(
			b => b.getAttribute("aria-label")
		);
		expect(labels).toEqual([
			"Run 3, Playing on PC",
			"Run 2, Completed on PC",
			"Run 1, Abandoned on PC"
		]);
	});

	it("opens the clicked run", () => {
		const first = run({ id: "1" });
		const second = run({ id: "2", status: "playing" });
		const { element, events } = render([first, second]);

		(element.querySelectorAll("ol button")[1] as HTMLButtonElement).click();

		expect(events.opened).toHaveBeenCalledWith(second);
	});

	it("emits runAdded from the New run button", () => {
		const { element, events } = render([]);

		const button = Array.from(element.querySelectorAll("button")).find(b =>
			b.textContent?.includes("New run")
		) as HTMLButtonElement;
		button.click();

		expect(events.added).toHaveBeenCalledTimes(1);
	});

	it("renders dates, duration, rating and the latest progress when present", () => {
		const { element } = render([
			run({
				status: "completed",
				startedAt: "2024-03-05T12:00:00.000Z",
				finishedAt: "2024-04-20T12:00:00.000Z",
				realDuration: 22,
				userRating: 4.5,
				latestProgress: { note: "Beat the final boss" } as never
			})
		]);

		const text = element.querySelector("ol")?.textContent ?? "";
		expect(text).toContain("Mar 5, 2024");
		expect(text).toContain("Apr 20, 2024");
		expect(text).toContain("22h");
		expect(text).toContain("4.5");
		expect(text).toContain("Beat the final boss");
	});

	it("uses placeholders for a missing start or finish date", () => {
		const open = render([
			run({ startedAt: "2024-03-05T12:00:00.000Z" })
		]).element;
		const unknown = render([
			run({ finishedAt: "2024-04-20T12:00:00.000Z" })
		]).element;

		expect(open.querySelector("ol")?.textContent).toContain("now");
		expect(unknown.querySelector("ol")?.textContent).toContain("?");
	});

	it("omits the optional rows for a bare run", () => {
		const { element } = render([run({})]);

		const icons = Array.from(
			element.querySelectorAll("ol .material-icons")
		).map(icon => icon.textContent?.trim());
		expect(icons).not.toContain("calendar_today");
		expect(icons).not.toContain("star");
		expect(icons).not.toContain("bookmark");
	});
});
