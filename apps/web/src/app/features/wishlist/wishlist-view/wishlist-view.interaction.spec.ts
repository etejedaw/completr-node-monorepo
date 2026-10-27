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
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { WishlistView } from "./wishlist-view";

@Component({
	selector: "app-wishlist-host",
	imports: [WishlistView, ToastContainer],
	template: `<app-wishlist-view /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class WishlistHost {}

const api = environment.apiUrl;
const wishlistUrl = `${api}/users/me/wishlist`;
const pc = { id: "p1", name: "PC", abbreviation: "PC" };
const nintendoSwitch = {
	id: "p2",
	name: "Nintendo Switch",
	abbreviation: "NSW"
};

function wanted(
	id: string,
	code: string,
	title: string,
	platform: WishlistEntry["platform"]
): WishlistEntry {
	return {
		id,
		position: 0,
		game: { id: `g-${code}`, code, title, isDlc: false },
		platform
	};
}

describe("WishlistView interaction", () => {
	let httpTesting: HttpTestingController;
	let wishlist: WishlistEntry[];
	let favoriteIds: string[];
	const searches: (string | null)[] = [];
	const removedGameIds: string[] = [];
	const exportRequests: { format: string | null; search: string | null }[] =
		[];

	function answer(req: TestRequest) {
		const { method, url, body, params } = req.request;
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: favoriteIds } });
		if (method === "PUT" && url === `${api}/users/me/favorites`) {
			favoriteIds = body.gameIds;
			return req.flush({
				data: {
					favorites: favoriteIds.map((gameId, index) => ({
						id: `fav-${gameId}`,
						position: index + 1,
						game: wishlist.find(entry => entry.game.id === gameId)!
							.game
					}))
				}
			});
		}
		if (method === "GET" && url === wishlistUrl) {
			const search = params.get("search");
			searches.push(search);
			const matches = wishlist.filter(
				entry =>
					!search ||
					entry.game.title
						.toLowerCase()
						.includes(search.toLowerCase())
			);
			return req.flush({
				data: { wishlist: matches, total: matches.length }
			});
		}
		if (method === "GET" && url === `${wishlistUrl}/export`) {
			exportRequests.push({
				format: params.get("format"),
				search: params.get("search")
			});
			return req.flush(new Blob(["title\n"], { type: "text/csv" }));
		}
		const removeMatch = url.match(/\/users\/me\/wishlist\/([^/]+)$/);
		if (method === "DELETE" && removeMatch) {
			removedGameIds.push(removeMatch[1]);
			wishlist = wishlist.filter(
				entry => entry.game.id !== removeMatch[1]
			);
			return req.flush(null);
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
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

	function coverTitles() {
		return screen
			.queryAllByRole("listitem")
			.map(item =>
				within(item)
					.queryAllByRole("img")
					.map(poster => poster.getAttribute("aria-label"))
					.find(Boolean)
			)
			.filter(Boolean);
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

	function platformFilter() {
		return within(
			screen.getByRole("navigation", { name: "Filter by platform" })
		);
	}

	function searchBox() {
		return screen.getByRole("textbox", { name: "Search Want to Get" });
	}

	async function renderWishlist() {
		const { fixture } = await render(WishlistHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Celeste", "Tunic"])
		);
	}

	beforeEach(() => {
		localStorage.clear();
		wishlist = [
			wanted("w1", "hades", "Hades", pc),
			wanted("w2", "celeste", "Celeste", nintendoSwitch),
			wanted("w3", "tunic", "Tunic", pc)
		];
		favoriteIds = [];
		searches.length = 0;
		removedGameIds.length = 0;
		exportRequests.length = 0;
		Object.assign(URL, {
			createObjectURL: vi.fn(() => "blob:export"),
			revokeObjectURL: vi.fn()
		});
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
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(Element.prototype, "getAnimations");
		Reflect.deleteProperty(URL, "createObjectURL");
		Reflect.deleteProperty(URL, "revokeObjectURL");
	});

	it("exports the whole Want to Get as CSV regardless of the search", async () => {
		const user = userEvent.setup();
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		await renderWishlist();

		expect(
			screen.queryByRole("button", {
				name: "Download Want to Get as JSON"
			})
		).not.toBeInTheDocument();
		await user.type(searchBox(), "hades");
		await untilVisible(() => expect(coverTitles()).toEqual(["Hades"]));
		await user.click(
			screen.getByRole("button", { name: "Download Want to Get as CSV" })
		);
		answerPending();

		expect(exportRequests).toEqual([{ format: "csv", search: null }]);
		expect(click).toHaveBeenCalledTimes(1);
		await untilVisible(() =>
			expect(
				screen.getByRole("button", {
					name: "Download Want to Get as CSV"
				})
			).not.toBeDisabled()
		);
		click.mockRestore();
	});

	it("filters by platform and then searches by title", async () => {
		const user = userEvent.setup();
		await renderWishlist();

		expect(
			platformFilter().getByRole("button", { name: /All/ })
		).toHaveAttribute("aria-pressed", "true");
		await user.click(platformFilter().getByRole("button", { name: /PC/ }));

		expect(coverTitles()).toEqual(["Hades", "Tunic"]);
		expect(
			platformFilter().getByRole("button", { name: /PC/ })
		).toHaveAttribute("aria-pressed", "true");

		await user.type(searchBox(), "tun");
		await untilVisible(() => expect(coverTitles()).toEqual(["Tunic"]));
		expect(searches.at(-1)).toBe("tun");

		await user.clear(searchBox());
		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Tunic"])
		);
	});

	it("explains when nothing matches and clears search and filter", async () => {
		const user = userEvent.setup();
		await renderWishlist();

		await user.click(platformFilter().getByRole("button", { name: /NSW/ }));
		await user.type(searchBox(), "hades");

		await untilVisible(() =>
			expect(
				screen.getByText(
					"Nothing in Want to Get matches your search or platform."
				)
			).toBeInTheDocument()
		);

		await user.click(
			screen.getByRole("button", { name: "Clear search & filter" })
		);
		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Celeste", "Tunic"])
		);
	});

	it("removes a game with undo, then commits the removal", async () => {
		const user = userEvent.setup();
		await renderWishlist();

		await user.click(
			cover("Tunic").getAllByRole("button", {
				name: "Remove Tunic from Want to Get"
			})[0]
		);
		expect(coverTitles()).toEqual(["Hades", "Celeste"]);
		expect(
			await screen.findByText("Removed Tunic from Want to Get")
		).toBeInTheDocument();
		expect(screen.getByText(/you want to get/)).toHaveTextContent(
			"2 games you want to get"
		);

		await user.click(screen.getByRole("button", { name: /Undo/ }));
		expect(coverTitles()).toEqual(["Hades", "Celeste", "Tunic"]);
		expect(removedGameIds).toEqual([]);

		await user.click(
			cover("Tunic").getAllByRole("button", {
				name: "Remove Tunic from Want to Get"
			})[0]
		);
		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);

		await untilVisible(() => expect(removedGameIds).toEqual(["g-tunic"]));
		expect(coverTitles()).toEqual(["Hades", "Celeste"]);
	});

	it("marks a wanted game as favorite", async () => {
		const user = userEvent.setup();
		await renderWishlist();

		await user.click(
			cover("Celeste").getAllByRole("button", {
				name: "Add Celeste to favorites"
			})[0]
		);

		await untilVisible(() =>
			expect(
				cover("Celeste").getAllByRole("button", {
					name: "Remove Celeste from favorites"
				})[0]
			).toHaveAttribute("aria-pressed", "true")
		);
		expect(favoriteIds).toEqual(["g-celeste"]);
		expect(
			cover("Hades").getAllByRole("button", {
				name: "Add Hades to favorites"
			})[0]
		).toHaveAttribute("aria-pressed", "false");
	});

	it("names the cover actions after the game", async () => {
		await renderWishlist();

		expect(
			cover("Hades").getAllByRole("button", {
				name: "Remove Hades from Want to Get"
			}).length
		).toBeGreaterThan(0);
		expect(
			cover("Hades").getAllByRole("button", {
				name: "Add Hades to favorites"
			}).length
		).toBeGreaterThan(0);
		expect(
			cover("Hades").queryAllByRole("button", {
				name: "Remove Celeste from Want to Get"
			})
		).toHaveLength(0);
	});
});
