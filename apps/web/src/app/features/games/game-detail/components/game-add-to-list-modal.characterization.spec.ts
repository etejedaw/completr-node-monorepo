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
import { RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../../environments/environment";
import { AuthService } from "../../../../core/services/auth";
import { ToastContainer } from "../../../../shared/components/toast-container/toast-container";
import { GameDetail } from "../game-detail";

@Component({
	selector: "app-game-detail-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GameDetailHost {}

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredList {
	id: string;
	name: string;
	isPublic: boolean;
	gameIds: string[];
}

const api = environment.apiUrl;
const viewer = {
	id: "u1",
	username: "ada",
	email: "ada@example.com",
	role: "user"
};
const platform = { id: "p1", name: "PC", abbreviation: "PC" };
const hades = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [platform],
	genres: [],
	scores: [{ source: "metacritic", score: 93 }],
	times: [{ source: "hltb", duration: 22 }],
	dlcs: [],
	parentGame: null,
	externalLinks: []
};

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number, type: string): ApiResponse => ({
	status,
	body: { type, title: type }
});

describe("GameAddToListModal characterization", () => {
	let httpTesting: HttpTestingController;
	let lists: StoredList[];
	let isFrozen: boolean;
	let failingListId: string | null;
	let unexpectedRequests: string[];

	function gameLists(gameId: string) {
		return {
			data: {
				lists: [],
				myLists: lists.map(list => ({
					id: list.id,
					name: list.name,
					isPublic: list.isPublic,
					contains: list.gameIds.includes(gameId)
				}))
			}
		};
	}

	function addGame(listId: string, gameId: string) {
		lists = lists.map(list =>
			list.id === listId && !list.gameIds.includes(gameId)
				? { ...list, gameIds: [...list.gameIds, gameId] }
				: list
		);
	}

	function removeGame(listId: string, gameId: string) {
		lists = lists.map(list =>
			list.id === listId
				? { ...list, gameIds: list.gameIds.filter(id => id !== gameId) }
				: list
		);
	}

	function addItem(listId: string, gameId: string): ApiResponse {
		if (!lists.some(list => list.id === listId))
			return failure(404, "LIST_ITEM_LIST_NOT_FOUND");
		if (listId === failingListId)
			return failure(500, "INTERNAL_SERVER_ERROR");
		if (isFrozen) return failure(402, "LIST_ITEM_FROZEN");
		addGame(listId, gameId);
		return { status: 201, body: { data: {} } };
	}

	function removeItem(listId: string, gameId: string): ApiResponse {
		if (!lists.some(list => list.id === listId))
			return failure(404, "LIST_ITEM_LIST_NOT_FOUND");
		if (listId === failingListId)
			return failure(500, "INTERNAL_SERVER_ERROR");
		removeGame(listId, gameId);
		return { status: 204, body: null };
	}

	function setGameLists(gameId: string, listIds: string[]): ApiResponse {
		if (listIds.some(id => !lists.some(list => list.id === id)))
			return failure(404, "LIST_ITEM_LIST_NOT_FOUND");
		const toAdd = lists.filter(
			list => listIds.includes(list.id) && !list.gameIds.includes(gameId)
		);
		const toRemove = lists.filter(
			list => !listIds.includes(list.id) && list.gameIds.includes(gameId)
		);
		if (toAdd.length > 0 && isFrozen)
			return failure(402, "LIST_ITEM_FROZEN");
		if ([...toAdd, ...toRemove].some(list => list.id === failingListId))
			return failure(500, "INTERNAL_SERVER_ERROR");
		toAdd.forEach(list => addGame(list.id, gameId));
		toRemove.forEach(list => removeGame(list.id, gameId));
		return ok(gameLists(gameId));
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, body } = req.request;
		if (url === `${api}/users/me`) return ok({ data: { user: viewer } });
		if (method === "GET" && url === `${api}/games/hades`)
			return ok({ data: { game: hades } });
		if (method === "GET" && url === `${api}/games/g1/lists`)
			return ok(gameLists("g1"));
		if (method === "PUT" && url === `${api}/games/g1/lists`)
			return setGameLists("g1", body.listIds);
		if (url === `${api}/games/g1/friends-activity`)
			return ok({ data: { friends: [] } });
		if (url === `${api}/games/g1/players`)
			return ok({ data: { players: [] } });
		if (url === `${api}/games/g1/reviews`)
			return ok({ data: { reviews: [] } });
		if (url === `${api}/score-sources`)
			return ok({
				data: {
					sources: [
						{ code: "metacritic", name: "Metacritic", scale: 100 }
					]
				}
			});
		if (url === `${api}/users/me/favorites/game-ids`)
			return ok({ data: { gameIds: [] } });
		if (url === `${api}/users/me/wishlist/game-ids`)
			return ok({ data: { gameIds: [] } });
		if (method === "GET" && url === `${api}/users/me/backlog`)
			return ok({ data: { backlog: [], total: 0 } });
		if (url === `${api}/users/me/game-shelf`)
			return ok({ data: { gameShelf: [], total: 0 } });
		if (url === `${api}/users/me/queue`)
			return ok({ data: { queue: [], total: 0 } });
		if (url.endsWith("/mood-tags")) return ok({ data: { tags: [] } });
		const addMatch = url.match(/\/lists\/([^/]+)\/items$/);
		if (method === "POST" && addMatch)
			return addItem(addMatch[1], body.gameId);
		const removeMatch = url.match(/\/lists\/([^/]+)\/items\/([^/]+)$/);
		if (method === "DELETE" && removeMatch)
			return removeItem(removeMatch[1], removeMatch[2]);
		unexpectedRequests.push(`${method} ${url}`);
		return null;
	}

	function answer(req: TestRequest) {
		const response = handle(req);
		if (!response || req.cancelled) return;
		req.flush(response.body, {
			status: response.status,
			statusText: String(response.status)
		});
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) break;
			pending.forEach(answer);
		}
		if (unexpectedRequests.length > 0)
			throw new Error(`Unexpected request: ${unexpectedRequests[0]}`);
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function libraryActions() {
		return within(
			screen.getByRole("list", { name: "More library actions" })
		);
	}

	function listsButton(name: RegExp) {
		return libraryActions().getByRole("button", { name });
	}

	function containing(gameId: string) {
		return lists
			.filter(list => list.gameIds.includes(gameId))
			.map(list => list.id);
	}

	async function renderGame() {
		const { fixture } = await render(GameDetailHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/hades"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		TestBed.inject(AuthService).loadUser().subscribe();
		await untilVisible(() =>
			expect(listsButton(/In 1 list/)).toBeInTheDocument()
		);
	}

	async function openListsDialog() {
		await userEvent.click(listsButton(/In 1 list/));
		return screen.findByRole("dialog", { name: "Add to your lists" });
	}

	async function toggle(dialog: HTMLElement, name: string) {
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: new RegExp(name) })
		);
	}

	async function save(dialog: HTMLElement) {
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Save" })
		);
		await untilVisible(() =>
			expect(
				within(dialog).getByRole("button", { name: "Save" })
			).toBeEnabled()
		);
	}

	beforeEach(() => {
		localStorage.clear();
		lists = [
			{ id: "l1", name: "Roguelikes", isPublic: true, gameIds: [] },
			{ id: "l2", name: "Couch co-op", isPublic: false, gameIds: [] },
			{
				id: "l3",
				name: "Played in 2024",
				isPublic: true,
				gameIds: ["g1"]
			}
		];
		isFrozen = false;
		failingListId = null;
		unexpectedRequests = [];
		Element.prototype.getAnimations = () => [];
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		try {
			answerPending();
			httpTesting.verify();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("same behavior", () => {
		it("adds the game to two lists and removes it from another", async () => {
			await renderGame();
			const dialog = await openListsDialog();

			await toggle(dialog, "Roguelikes");
			await toggle(dialog, "Couch co-op");
			await toggle(dialog, "Played in 2024");
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Save" })
			);

			await untilVisible(() =>
				expect(listsButton(/In 2 lists/)).toHaveAttribute(
					"aria-pressed",
					"true"
				)
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(containing("g1")).toEqual(["l1", "l2"]);
		});

		it("closes without changing any list when nothing was toggled", async () => {
			await renderGame();
			const dialog = await openListsDialog();

			await userEvent.click(
				within(dialog).getByRole("button", { name: "Save" })
			);

			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(listsButton(/In 1 list/)).toBeInTheDocument();
			expect(containing("g1")).toEqual(["l3"]);
		});
	});

	describe("intended change on failure", () => {
		it("changes no list when a frozen free user adds the game to a list", async () => {
			isFrozen = true;
			await renderGame();
			const dialog = await openListsDialog();

			await toggle(dialog, "Roguelikes");
			await toggle(dialog, "Played in 2024");
			await save(dialog);

			expect(
				screen.getByRole("dialog", { name: "Add to your lists" })
			).toBeInTheDocument();
			expect(containing("g1")).toEqual(["l3"]);
		});

		it("changes no list when the second change fails on the server", async () => {
			failingListId = "l2";
			await renderGame();
			const dialog = await openListsDialog();

			await toggle(dialog, "Roguelikes");
			await toggle(dialog, "Couch co-op");
			await save(dialog);

			expect(
				screen.getByRole("dialog", { name: "Add to your lists" })
			).toBeInTheDocument();
			expect(containing("g1")).toEqual(["l3"]);
		});
	});
});
