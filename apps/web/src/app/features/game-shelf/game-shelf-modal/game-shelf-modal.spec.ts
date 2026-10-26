import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NgpDialogRef } from "ng-primitives/dialog";

import { environment } from "../../../../environments/environment";
import { type Game, type GameShelfEntry } from "../../../core/models";
import { GameShelfModal, type GameShelfModalData } from "./game-shelf-modal";

const shelfUrl = `${environment.apiUrl}/users/me/game-shelf`;

const entry = {
	id: "s1",
	gameId: "g1",
	platformId: "p1",
	isPublic: true,
	game: {
		id: "g1",
		code: "gears-of-war",
		title: "Gears of War",
		isDlc: false
	},
	platform: { id: "p1", name: "Xbox 360", abbreviation: "X360" }
} as unknown as GameShelfEntry;

const game = {
	id: "g1",
	code: "gears-of-war",
	title: "Gears of War",
	platforms: [{ id: "p1", name: "Xbox 360" }]
} as unknown as Game;

describe("GameShelfModal", () => {
	let httpTesting: HttpTestingController;
	let close: ReturnType<typeof vi.fn>;

	async function renderModal(data: GameShelfModalData) {
		await render(GameShelfModal, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: NgpDialogRef, useValue: { data, close } }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function submitAndCaptureBody(method: string, url: string) {
		await userEvent.click(
			screen.getByRole("button", {
				name: method === "PATCH" ? "Save" : "Add"
			})
		);
		const req = httpTesting.expectOne({ method, url });
		req.flush({ data: { gameShelf: entry } });
		await waitFor(() => expect(close).toHaveBeenCalledWith("saved"));
		return req.request.body;
	}

	beforeEach(() => {
		close = vi.fn();
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
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends an acquired date picked on an empty field as a plain day when editing", async () => {
		await renderModal({ entry, preselectedGame: null });

		await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
		await userEvent.type(screen.getByLabelText("Acquired"), "2026-03-01");
		const body = await submitAndCaptureBody("PATCH", `${shelfUrl}/s1`);

		expect(body).toEqual(
			expect.objectContaining({ acquiredAt: "2026-03-01" })
		);
	});

	it("sends an acquired date as a plain day when adding", async () => {
		await renderModal({ entry: null, preselectedGame: game });

		await userEvent.type(screen.getByLabelText("Acquired"), "2026-03-01");
		const body = await submitAndCaptureBody("POST", shelfUrl);

		expect(body).toEqual(
			expect.objectContaining({ gameId: "g1", acquiredAt: "2026-03-01" })
		);
	});
});
