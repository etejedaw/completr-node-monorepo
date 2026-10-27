import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NgpDialogRef } from "ng-primitives/dialog";
import { provideExitAnimationManager } from "ng-primitives/internal";
import { of, throwError } from "rxjs";

import {
	type BacklogEntry,
	type Game,
	type GamePlatinum
} from "../../../core/models";
import { BacklogService } from "../../backlog/backlog";
import { GamesService } from "../../games/games";
import { PlatinumService } from "../platinum";
import { PlatinumDialog, type PlatinumDialogData } from "./platinum-dialog";

const dialogRef = vi.hoisted(() => ({
	data: {} as PlatinumDialogData,
	config: { role: "dialog", modal: true },
	disableClose: false,
	close: vi.fn()
}));

const platinumService = { save: vi.fn(), remove: vi.fn() };
const gamesService = { getByCode: vi.fn(), searchLocal: vi.fn() };
const backlogService = { getMyBacklog: vi.fn() };

const PLATFORMS = [
	{ id: "pc", name: "PC", code: "pc", abbreviation: "PC" },
	{
		id: "ps5",
		name: "PlayStation 5",
		code: "ps5",
		abbreviation: "PS5"
	}
];

const RUNS = [
	{
		id: "run-2",
		status: "completed",
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "ps5", abbreviation: "PS5" }
	},
	{
		id: "run-1",
		status: "abandoned",
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "pc", abbreviation: "PC" }
	}
] as BacklogEntry[];

const SAVED: GamePlatinum = {
	id: "platinum-1",
	backlogId: "run-2",
	platformId: "ps5",
	platinumedAt: "2026-03-12",
	notes: "Hard"
};

describe("PlatinumDialog", () => {
	async function renderDialog(platinum: GamePlatinum | null = null) {
		return renderWithData({
			context: {
				game: {
					id: "game-1",
					code: "hades",
					title: "Hades",
					platforms: PLATFORMS
				},
				runs: RUNS,
				platinum
			}
		});
	}

	async function renderWithData(data: PlatinumDialogData) {
		dialogRef.data = data;
		await render(PlatinumDialog, {
			providers: [
				provideExitAnimationManager(),
				{ provide: NgpDialogRef, useValue: dialogRef },
				{ provide: PlatinumService, useValue: platinumService },
				{ provide: GamesService, useValue: gamesService },
				{ provide: BacklogService, useValue: backlogService }
			]
		});
		return within(await screen.findByRole("dialog"));
	}

	beforeEach(() => {
		dialogRef.close.mockClear();
		platinumService.save.mockReset();
		platinumService.remove.mockReset();
		gamesService.getByCode.mockReset();
		gamesService.searchLocal.mockReset();
		backlogService.getMyBacklog.mockReset();
		Element.prototype.getAnimations = () => [];
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
		Reflect.deleteProperty(Element.prototype, "getAnimations");
		vi.unstubAllGlobals();
	});

	it("saves the chosen run, its platform, the date and the notes", async () => {
		const user = userEvent.setup();
		platinumService.save.mockReturnValue(of(SAVED));
		const dialog = await renderDialog();

		await user.click(dialog.getByRole("button", { name: /^Run/ }));
		await user.click(
			screen.getByRole("menuitemradio", { name: /Run #2 · Completed/ })
		);
		await user.type(dialog.getByLabelText("Platinumed on"), "2026-03-12");
		await user.type(dialog.getByLabelText("Notes"), "  Hard  ");
		await user.click(dialog.getByRole("button", { name: "Save" }));

		expect(platinumService.save).toHaveBeenCalledWith("game-1", {
			backlogId: "run-2",
			platformId: "ps5",
			platinumedAt: "2026-03-12",
			notes: "Hard"
		});
		expect(dialogRef.close).toHaveBeenCalledWith({ platinum: SAVED });
	});

	it("saves an empty platinum as nulls", async () => {
		const user = userEvent.setup();
		platinumService.save.mockReturnValue(of(SAVED));
		const dialog = await renderDialog();

		await user.click(dialog.getByRole("button", { name: "Save" }));

		expect(platinumService.save).toHaveBeenCalledWith("game-1", {
			backlogId: null,
			platformId: null,
			platinumedAt: null,
			notes: null
		});
	});

	it("prefills an existing platinum and removes it after confirming", async () => {
		const user = userEvent.setup();
		platinumService.remove.mockReturnValue(of(null));
		const dialog = await renderDialog(SAVED);

		expect(
			dialog.getByRole("heading", { name: "Edit platinum" })
		).toBeInTheDocument();
		expect(dialog.getByLabelText("Platinumed on")).toHaveValue(
			"2026-03-12"
		);
		expect(dialog.getByLabelText("Notes")).toHaveValue("Hard");

		await user.click(dialog.getByRole("button", { name: "Remove" }));
		await user.click(dialog.getByRole("button", { name: "Yes, delete" }));

		expect(platinumService.remove).toHaveBeenCalledWith("game-1");
		expect(dialogRef.close).toHaveBeenCalledWith("removed");
	});

	it("keeps the dialog open with an error when saving fails", async () => {
		const user = userEvent.setup();
		platinumService.save.mockReturnValue(throwError(() => new Error("x")));
		const dialog = await renderDialog();

		await user.click(dialog.getByRole("button", { name: "Save" }));

		expect(
			dialog.getByText("The platinum could not be saved. Try again.")
		).toBeInTheDocument();
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it("loads the game, its runs and its platinum when opened from the platinums page", async () => {
		gamesService.getByCode.mockReturnValue(
			of({
				id: "game-1",
				code: "hades",
				title: "Hades",
				platforms: PLATFORMS,
				userPlatinum: SAVED
			} as Game)
		);
		backlogService.getMyBacklog.mockReturnValue(
			of({ data: { backlog: RUNS, total: RUNS.length } })
		);

		const dialog = await renderWithData({
			game: { id: "game-1", code: "hades" }
		});

		expect(
			await dialog.findByRole("heading", { name: "Edit platinum" })
		).toBeInTheDocument();
		expect(gamesService.getByCode).toHaveBeenCalledWith("hades");
		expect(backlogService.getMyBacklog).toHaveBeenCalledWith({
			game_id: "game-1"
		});
		expect(dialog.getByLabelText("Notes")).toHaveValue("Hard");
	});

	it("starts with the catalog search when no game is given", async () => {
		const dialog = await renderWithData({});

		expect(
			dialog.getByRole("heading", { name: "Add a platinum" })
		).toBeInTheDocument();
		expect(
			dialog.getByPlaceholderText("Search games by title...")
		).toBeInTheDocument();
		expect(
			dialog.queryByRole("button", { name: "Save" })
		).not.toBeInTheDocument();
	});

	it("offers a retry when the game cannot be loaded", async () => {
		gamesService.getByCode.mockReturnValue(
			throwError(() => new Error("x"))
		);
		backlogService.getMyBacklog.mockReturnValue(
			of({ data: { backlog: [], total: 0 } })
		);

		const dialog = await renderWithData({
			game: { id: "game-1", code: "hades" }
		});

		expect(
			await dialog.findByText("The game could not be loaded.")
		).toBeInTheDocument();
		expect(
			dialog.getByRole("button", { name: "Try again" })
		).toBeInTheDocument();
	});
});
