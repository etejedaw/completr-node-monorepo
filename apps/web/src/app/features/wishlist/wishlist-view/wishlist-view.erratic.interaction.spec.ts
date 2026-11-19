import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type WishlistEntry } from "../../../core/models";
import { UiToastContainer } from "../../../shared/ui";
import { WishlistView } from "./wishlist-view";

@Component({
	selector: "app-wishlist-erratic-host",
	imports: [WishlistView, UiToastContainer],
	template: `<app-wishlist-view /><ui-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class WishlistHost {}

const api = environment.apiUrl;
const wishlistUrl = `${api}/users/me/wishlist`;
const favoritesUrl = `${api}/users/me/favorites`;
const pc = { id: "p1", name: "PC", abbreviation: "PC" };

function wanted(id: string, code: string, title: string): WishlistEntry {
	return {
		id,
		position: 0,
		game: { id: `g-${code}`, code, title, isDlc: false },
		platform: pc
	};
}

describe("WishlistView erratic interaction", () => {
	let httpTesting: HttpTestingController;
	let wishlist: WishlistEntry[];
	let favoriteWrites: string[][];
	let favoriteStatus: number;
	let removeStatus: number;

	function fail(req: TestRequest, status: number) {
		req.flush(
			{ title: "Failed", status },
			{ status, statusText: "Failed" }
		);
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (url === `${favoritesUrl}/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (method === "PUT" && url === favoritesUrl) {
			favoriteWrites.push(body.gameIds);
			if (favoriteStatus !== 200) return fail(req, favoriteStatus);
			return req.flush({
				data: {
					favorites: body.gameIds.map(
						(gameId: string, i: number) => ({
							id: `fav-${gameId}`,
							position: i + 1,
							game: wishlist.find(
								entry => entry.game.id === gameId
							)!.game
						})
					)
				}
			});
		}
		if (method === "GET" && url === wishlistUrl)
			return req.flush({
				data: { wishlist, total: wishlist.length }
			});
		if (method === "DELETE" && url.startsWith(`${wishlistUrl}/`)) {
			if (removeStatus !== 204) return fail(req, removeStatus);
			return req.flush(null);
		}
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: [] } });
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function cover(title: string) {
		const item = screen
			.getAllByRole("listitem")
			.find(
				candidate =>
					within(candidate).queryAllByRole("img", { name: title })
						.length > 0
			);
		return within(item as HTMLElement);
	}

	async function renderWishlist() {
		const { fixture } = await render(WishlistHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0)
		);
	}

	beforeEach(() => {
		localStorage.clear();
		wishlist = [
			wanted("w1", "hades", "Hades"),
			wanted("w2", "celeste", "Celeste")
		];
		favoriteWrites = [];
		favoriteStatus = 200;
		removeStatus = 204;
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
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
	});

	it("sends a single favorite write when the heart is double clicked", async () => {
		const user = userEvent.setup();
		await renderWishlist();

		await user.dblClick(
			cover("Hades").getAllByRole("button", {
				name: "Add Hades to favorites"
			})[0]
		);
		await untilVisible(() =>
			expect(
				cover("Hades").getAllByRole("button", {
					name: "Remove Hades from favorites"
				})[0]
			).toHaveAttribute("aria-pressed", "true")
		);

		expect(favoriteWrites).toEqual([["g-hades"]]);
	});

	it("reverts the heart and explains when the favorite write fails", async () => {
		const user = userEvent.setup();
		favoriteStatus = 500;
		await renderWishlist();

		await user.click(
			cover("Hades").getAllByRole("button", {
				name: "Add Hades to favorites"
			})[0]
		);

		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't update your favorites. Try again.")
			).toBeInTheDocument()
		);
		expect(
			cover("Hades").getAllByRole("button", {
				name: "Add Hades to favorites"
			})[0]
		).toHaveAttribute("aria-pressed", "false");
	});

	it("keeps a game removed when the server says it was already gone", async () => {
		const user = userEvent.setup();
		removeStatus = 404;
		await renderWishlist();

		await user.click(
			cover("Celeste").getAllByRole("button", {
				name: /Remove Celeste/
			})[0]
		);
		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);
		await untilVisible(() =>
			expect(
				screen.queryByText("Could not remove the game.")
			).not.toBeInTheDocument()
		);

		expect(screen.queryAllByRole("img", { name: "Celeste" })).toHaveLength(
			0
		);
	});

	it("restores the game and explains when removing fails with a server error", async () => {
		const user = userEvent.setup();
		removeStatus = 500;
		await renderWishlist();

		await user.click(
			cover("Celeste").getAllByRole("button", {
				name: /Remove Celeste/
			})[0]
		);
		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);

		await untilVisible(() =>
			expect(
				screen.getByText("Could not remove the game.")
			).toBeInTheDocument()
		);
		await untilVisible(() =>
			expect(
				screen.getAllByRole("img", { name: "Celeste" }).length
			).toBeGreaterThan(0)
		);
	});
});
