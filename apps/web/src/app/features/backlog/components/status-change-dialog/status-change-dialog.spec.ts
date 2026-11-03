import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import {
	type BacklogEntry,
	type BacklogStatus,
	type GamePlatinum
} from "../../../../core/models";
import { StatusChangeDialog } from "./status-change-dialog";
import { type PendingStatusUpdate } from "./status-change-dialog.model";

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

		expect(dialog.getByLabelText("Platinumed on")).toHaveAccessibleName(
			"Platinumed on: Mar 12, 2026"
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
			dialog.getByText(/Platinumed in this run on Jan 5, 2026/)
		).toBeInTheDocument();
	});
});

describe("StatusChangeDialog header and labels", () => {
	async function renderDialog(pending: PendingStatusUpdate) {
		await render(StatusChangeDialog, {
			inputs: { pendingUpdate: pending }
		});
		return screen.findByRole("dialog");
	}

	function headerIcon(dialog: HTMLElement) {
		return dialog.querySelector<HTMLElement>(
			'[aria-hidden="true"].rounded-xl'
		);
	}

	function labelText(dialog: HTMLElement, text: RegExp) {
		const label = Array.from(
			dialog.querySelectorAll("label, span[id]")
		).find(candidate => text.test(candidate.textContent ?? ""));
		return label?.textContent?.replace(/\s+/g, " ").trim();
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

	const cases: [BacklogStatus, string, string][] = [
		["completed", "check_circle", "text-success"],
		["abandoned", "cancel", "text-danger"],
		["playing", "play_circle", "text-brand"],
		["endless", "all_inclusive", "text-brand"],
		["not_started", "schedule", "text-brand"]
	];
	for (const [status, icon, toneClass] of cases) {
		it(`anchors the ${status} status icon in the header with its tone`, async () => {
			const dialog = await renderDialog(pendingUpdate(status));

			const iconBox = headerIcon(dialog);
			expect(iconBox?.textContent?.trim()).toBe(icon);
			expect(iconBox?.classList).toContain(toneClass);
			expect(dialog.querySelector("[dialogLead]")).toBeNull();
		});
	}

	it("keeps the dialog named by the status, not by the icon", async () => {
		await renderDialog(pendingUpdate("completed"));

		expect(
			screen.getByRole("dialog", { name: "Completed?" })
		).toBeInTheDocument();
	});

	it("marks the optional fields and never shows a required asterisk", async () => {
		const dialog = await renderDialog(pendingUpdate("completed"));

		expect(labelText(dialog, /^\s*Real duration/)).toBe(
			"Real duration (hours) Optional"
		);
		expect(labelText(dialog, /^\s*Notes/)).toBe("Notes Optional");
		expect(labelText(dialog, /^\s*Your rating/)).toBe(
			"Your rating Optional"
		);
		expect(labelText(dialog, /^\s*Finished on/)).toBe("Finished on");
		expect(dialog.textContent).not.toContain("*");
	});

	it("accepts garbage typed into the optional fields without breaking", async () => {
		const user = userEvent.setup();
		const edited = vi.fn();
		await render(StatusChangeDialog, {
			inputs: { pendingUpdate: pendingUpdate("completed") },
			on: { edited }
		});
		const dialog = within(await screen.findByRole("dialog"));

		await user.type(
			dialog.getByLabelText("Real duration (hours) Optional"),
			"abc-1e"
		);
		await user.type(
			dialog.getByLabelText("Notes Optional"),
			"<script>{{ x }}</script>"
		);

		expect(edited).toHaveBeenCalled();
		expect(
			dialog.getByRole("button", { name: "Confirm" })
		).toBeInTheDocument();
	});
});
