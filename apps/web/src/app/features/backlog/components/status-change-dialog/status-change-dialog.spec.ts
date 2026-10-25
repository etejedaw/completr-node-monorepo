import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import {
	type BacklogEntry,
	type BacklogStatus,
	type GamePlatinum
} from "../../../../core/models";
import {
	type PendingStatusUpdate,
	StatusChangeDialog
} from "./status-change-dialog";

function pendingUpdate(
	status: BacklogStatus,
	overrides: Partial<PendingStatusUpdate> = {},
	platinum: GamePlatinum | null = null
): PendingStatusUpdate {
	const entry: BacklogEntry = {
		id: "run-1",
		status: "playing",
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "platform-1", abbreviation: "PC" },
		platinum
	};
	return {
		entry,
		status,
		startedAt: "",
		finishedAt: "2026-03-12",
		realDuration: "",
		rating: null,
		reviewToggle: false,
		reviewContent: "",
		notes: "",
		markPlatinum: false,
		platinumedAt: "2026-03-12",
		...overrides
	};
}

describe("StatusChangeDialog platinum", () => {
	async function renderDialog(pending: PendingStatusUpdate) {
		const edited = vi.fn();
		await render(StatusChangeDialog, {
			inputs: { pendingUpdate: pending },
			on: { edited }
		});
		const dialog = await screen.findByRole("dialog");
		return { dialog: within(dialog), edited };
	}

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

	it("offers Mark as platinumed when completing a game without platinum", async () => {
		const user = userEvent.setup();
		const { dialog, edited } = await renderDialog(
			pendingUpdate("completed")
		);

		expect(
			dialog.queryByLabelText("Platinumed on")
		).not.toBeInTheDocument();
		await user.click(
			dialog.getByRole("switch", { name: "Mark as platinumed" })
		);

		expect(edited).toHaveBeenCalledWith({ markPlatinum: true });
	});

	it("asks for the platinum date once Mark as platinumed is on", async () => {
		const { dialog } = await renderDialog(
			pendingUpdate("completed", { markPlatinum: true })
		);

		expect(dialog.getByLabelText("Platinumed on")).toHaveValue(
			"2026-03-12"
		);
	});

	it("does not offer the platinum for other statuses", async () => {
		const { dialog } = await renderDialog(pendingUpdate("abandoned"));

		expect(
			dialog.queryByRole("switch", { name: "Mark as platinumed" })
		).not.toBeInTheDocument();
	});

	it("reflects a platinum earned in another run instead of offering it", async () => {
		const { dialog } = await renderDialog(
			pendingUpdate(
				"completed",
				{},
				{
					id: "platinum-1",
					backlogId: "run-0",
					platformId: null,
					platinumedAt: null
				}
			)
		);

		expect(
			dialog.getByText("You already platinumed this game")
		).toBeInTheDocument();
		expect(
			dialog.queryByRole("switch", { name: "Mark as platinumed" })
		).not.toBeInTheDocument();
	});

	it("reflects the platinum of this run with its date", async () => {
		const { dialog } = await renderDialog(
			pendingUpdate(
				"completed",
				{},
				{
					id: "platinum-1",
					backlogId: "run-1",
					platformId: null,
					platinumedAt: "2026-01-05"
				}
			)
		);

		expect(
			dialog.getByText(/Platinumed on Jan 5, 2026/)
		).toBeInTheDocument();
	});
});
