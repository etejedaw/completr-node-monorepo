import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject } from "rxjs";

import { type PlatinumEntry } from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { PlatinumService } from "../platinum";
import { PlatinumDialog } from "../platinum-dialog/platinum-dialog";
import { PlatinumList } from "./platinum-list";

const PLATINUMS: PlatinumEntry[] = [
	{
		id: "p1",
		backlogId: null,
		platformId: "ps5",
		platinumedAt: "2026-03-12",
		notes: "Last trophy was the speedrun",
		platform: { id: "ps5", name: "PlayStation 5", abbreviation: "PS5" },
		game: { id: "g1", code: "astro-bot", title: "Astro Bot", isDlc: false }
	},
	{
		id: "p2",
		backlogId: null,
		platformId: null,
		platinumedAt: null,
		notes: null,
		platform: null,
		game: {
			id: "g2",
			code: "bloodborne",
			title: "Bloodborne",
			isDlc: false
		}
	}
];

describe("PlatinumList", () => {
	const platinumService = { getMine: vi.fn() };
	const dialogs = { open: vi.fn() };
	const toast = { success: vi.fn() };
	let afterClosed: Subject<unknown>;

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		localStorage.clear();
		afterClosed = new Subject();
		platinumService.getMine
			.mockReset()
			.mockReturnValue(of({ data: { platinums: PLATINUMS, total: 2 } }));
		dialogs.open.mockReset().mockReturnValue({ afterClosed });
		toast.success.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(PlatinumList, {
			providers: [
				provideRouter([]),
				{ provide: PlatinumService, useValue: platinumService },
				{ provide: DialogService, useValue: dialogs },
				{ provide: ToastService, useValue: toast }
			]
		});
	}

	it("loads the first page of the session user's platinums", async () => {
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Platinums" })
		).toBeInTheDocument();
		expect(platinumService.getMine).toHaveBeenCalledWith({
			limit: 100,
			offset: 0,
			search: undefined
		});
		expect(screen.getAllByText("Astro Bot").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Bloodborne").length).toBeGreaterThan(0);
	});

	it("opens the dialog with the catalog search to add a platinum and reloads after saving", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(
			screen.getAllByRole("button", { name: /Add platinum/ })[0]
		);
		afterClosed.next({ platinum: { id: "p3" } });

		expect(dialogs.open).toHaveBeenCalledWith(PlatinumDialog, {
			data: {}
		});
		expect(toast.success).toHaveBeenCalledWith("Platinum saved");
		expect(platinumService.getMine).toHaveBeenCalledTimes(2);
	});

	it("opens the dialog for the chosen platinum from the grid", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(
			screen.getByRole("button", { name: "Edit platinum of Bloodborne" })
		);

		expect(dialogs.open).toHaveBeenCalledWith(PlatinumDialog, {
			data: { game: { id: "g2", code: "bloodborne" } }
		});
	});

	it("shows the notes and an edit action per row in the hardcore view", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(screen.getByRole("button", { name: /Hardcore/ }));

		const table = screen.getByRole("table");
		expect(
			within(table).getByText("Last trophy was the speedrun")
		).toBeInTheDocument();
		await user.click(
			within(table).getByRole("button", {
				name: "Edit platinum of Astro Bot"
			})
		);
		expect(dialogs.open).toHaveBeenCalledWith(PlatinumDialog, {
			data: { game: { id: "g1", code: "astro-bot" } }
		});
		expect(localStorage.getItem("completr.platinums.viewMode")).toBe(
			"hardcore"
		);
	});

	it("shows the empty state with an action to add the first platinum", async () => {
		platinumService.getMine.mockReturnValue(
			of({ data: { platinums: [], total: 0 } })
		);
		await renderPage();

		expect(await screen.findByText("No platinums yet")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Add platinum/ })
		).toBeInTheDocument();
	});
});
