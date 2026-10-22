import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NgpDialogRef } from "ng-primitives/dialog";
import { provideExitAnimationManager } from "ng-primitives/internal";

import { type BacklogEntry } from "../../../../core/models";
import { type QueueableRun } from "../queue-intent";
import { GameQueueRunPicker } from "./game-queue-run-picker";

const entry = (overrides: Partial<BacklogEntry>) =>
	({
		id: "r1",
		status: "not_started",
		platform: { id: "p1", abbreviation: "PC" },
		startedAt: null,
		...overrides
	}) as unknown as BacklogEntry;

const dialogRef = vi.hoisted(() => ({
	data: {} as { gameTitle: string; runs: QueueableRun[] },
	config: { role: "dialog", modal: true },
	disableClose: false,
	close: vi.fn()
}));

describe("GameQueueRunPicker", () => {
	function renderPicker(runs: QueueableRun[]) {
		dialogRef.data = { gameTitle: "Hades", runs };
		return render(GameQueueRunPicker, {
			providers: [
				provideExitAnimationManager(),
				{ provide: NgpDialogRef, useValue: dialogRef }
			]
		});
	}

	beforeEach(() => {
		dialogRef.close.mockClear();
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

	it("shows the game title and one option per run with its number", async () => {
		const pc = entry({
			id: "r1",
			platform: { abbreviation: "PC" } as never
		});
		const switchRun = entry({
			id: "r2",
			platform: { abbreviation: "NSW" } as never
		});
		await renderPicker([
			{ run: pc, number: 2 },
			{ run: switchRun, number: 1 }
		]);

		expect(
			screen.getByRole("dialog", { name: "Pick a run for Up Next" })
		).toBeInTheDocument();
		expect(screen.getByText("Hades")).toBeInTheDocument();
		expect(screen.getByText("Run #2")).toBeInTheDocument();
		expect(screen.getByText("Run #1")).toBeInTheDocument();
		expect(screen.getByText("NSW")).toBeInTheDocument();
	});

	it("shows the start date or a placeholder", async () => {
		await renderPicker([
			{
				run: entry({
					id: "r1",
					startedAt: "2024-03-05T12:00:00.000Z"
				}),
				number: 2
			},
			{ run: entry({ id: "r2" }), number: 1 }
		]);

		expect(screen.getByText("Started Mar 5, 2024")).toBeInTheDocument();
		expect(screen.getByText("No start date yet")).toBeInTheDocument();
	});

	it("closes with the chosen run", async () => {
		const first = entry({ id: "r1" });
		const second = entry({
			id: "r2",
			platform: { abbreviation: "NSW" } as never
		});
		await renderPicker([
			{ run: first, number: 2 },
			{ run: second, number: 1 }
		]);

		await userEvent.click(screen.getByRole("button", { name: /Run #1/ }));

		expect(dialogRef.close).toHaveBeenCalledTimes(1);
		expect(dialogRef.close).toHaveBeenCalledWith(second);
	});

	it("closes with newRun when asking for a new run", async () => {
		await renderPicker([{ run: entry({}), number: 1 }]);

		await userEvent.click(screen.getByRole("button", { name: /New run/ }));

		expect(dialogRef.close).toHaveBeenCalledWith("newRun");
	});

	it("closes without a result on Cancel", async () => {
		await renderPicker([{ run: entry({}), number: 1 }]);

		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(dialogRef.close).toHaveBeenCalledWith();
	});
});
