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
import { Router, RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type List, type ListItem } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { ListDetail } from "../list-detail/list-detail";
import { ListOverview } from "./list-overview";

@Component({
	selector: "app-lists-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class ListsHost {}

const api = environment.apiUrl;
const owner = {
	id: "u1",
	username: "ada",
	email: "ada@example.com",
	role: "user"
};

const catalog = [
	{ id: "g1", code: "hades", title: "Hades", isDlc: false },
	{ id: "g2", code: "celeste", title: "Celeste", isDlc: false },
	{ id: "g3", code: "hollow-knight", title: "Hollow Knight", isDlc: false }
];

describe("Lists interaction", () => {
	let httpTesting: HttpTestingController;
	let lists: List[];
	const itemReplacements: string[][] = [];
	const listUpdates: unknown[] = [];

	function itemsFor(gameIds: string[]): ListItem[] {
		return gameIds.map((gameId, index) => ({
			id: `item-${gameId}`,
			position: index + 1,
			score: 4,
			duration: 20,
			game: catalog.find(game => game.id === gameId)!
		}));
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		const listMatch = url.match(/\/lists\/(list-\d+)(\/items)?$/);
		if (url === `${api}/users/me`)
			return req.flush({ data: { user: owner } });
		if (method === "GET" && url === `${api}/lists/me`)
			return req.flush({
				data: { lists, total: lists.length, frozen: false }
			});
		if (url === `${api}/lists/following`)
			return req.flush({ data: { lists: [] } });
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		if (url === `${api}/score-sources`)
			return req.flush({
				data: {
					sources: [
						{ code: "metacritic", name: "Metacritic", scale: 100 }
					]
				}
			});
		if (method === "POST" && url === `${api}/lists`) {
			const created: List = {
				id: `list-${lists.length + 1}`,
				userId: owner.id,
				items: [],
				followerCount: 0,
				...body
			};
			lists = [...lists, created];
			return req.flush({ data: { list: created } });
		}
		if (method === "GET" && url.startsWith(`${api}/games/search`)) {
			const query = new URL(url).searchParams.get("query")!.toLowerCase();
			return req.flush({
				data: {
					games: catalog.filter(game =>
						game.title.toLowerCase().includes(query)
					)
				}
			});
		}
		if (listMatch) {
			const id = listMatch[1];
			const current = lists.find(list => list.id === id)!;
			let next = current;
			if (method === "PUT" && listMatch[2]) {
				itemReplacements.push(body.gameIds);
				next = { ...current, items: itemsFor(body.gameIds) };
			}
			if (method === "PATCH") {
				listUpdates.push(body);
				next = { ...current, ...body };
			}
			lists = lists.map(list => (list.id === id ? next : list));
			return req.flush(
				listMatch[2]
					? { data: { items: next.items } }
					: { data: { list: next } }
			);
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

	function rankedList() {
		const [ranking] = screen
			.getAllByRole("list")
			.filter(list => list.tagName === "OL");
		return ranking;
	}

	function rankingTitles() {
		return within(rankedList())
			.getAllByRole("listitem")
			.map(
				row =>
					within(row)
						.getAllByRole("link")
						.map(link => link.getAttribute("aria-label"))
						.find(Boolean) ?? null
			);
	}

	function searchGames() {
		return screen
			.getAllByPlaceholderText("Search games to add...")
			.find(element => element instanceof HTMLInputElement)!;
	}

	async function renderLists() {
		const { fixture } = await render(ListsHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{ path: "lists", component: ListOverview },
				{ path: "lists/:id", component: ListDetail }
			],
			initialRoute: "/lists"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		TestBed.inject(AuthService).loadUser().subscribe();
		await untilVisible(() =>
			expect(screen.getByText("No lists yet")).toBeInTheDocument()
		);
	}

	async function createListWithGames(
		user: ReturnType<typeof userEvent.setup>
	) {
		await user.click(
			screen.getAllByRole("button", { name: /Create list/ })[0]
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Create list"
		});
		answerPending();
		await user.type(within(dialog).getByLabelText(/Name/), "Metroidvanias");
		await user.click(
			within(dialog).getByRole("button", { name: "Create" })
		);
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { name: "Metroidvanias" })
			).toBeInTheDocument()
		);

		await user.click(
			screen.getAllByRole("button", { name: /Add game/ })[0]
		);
		for (const title of ["Hades", "Celeste", "Hollow Knight"]) {
			await user.clear(searchGames());
			await user.type(searchGames(), title);
			await untilVisible(() =>
				expect(
					screen.getByRole("button", {
						name: new RegExp(`^${title}`)
					})
				).toBeEnabled()
			);
			await user.click(
				screen.getByRole("button", { name: new RegExp(`^${title}`) })
			);
			await untilVisible(() => expect(rankingTitles()).toContain(title));
		}
	}

	beforeEach(() => {
		localStorage.clear();
		lists = [];
		itemReplacements.length = 0;
		listUpdates.length = 0;
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
	});

	it("creates a list, adds games and opens it ranked in the order they were added", async () => {
		const user = userEvent.setup();
		await renderLists();

		await createListWithGames(user);

		expect(TestBed.inject(Router).url).toBe("/lists/list-1");
		expect(rankingTitles()).toEqual(["Hades", "Celeste", "Hollow Knight"]);
		expect(itemReplacements).toEqual([
			["g1"],
			["g1", "g2"],
			["g1", "g2", "g3"]
		]);
		expect(screen.getByText("3 games")).toBeInTheDocument();

		await user.clear(searchGames());
		await user.type(searchGames(), "Hades");
		await untilVisible(() =>
			expect(
				screen.getByRole("button", { name: /^Hades.*In list/ })
			).toBeDisabled()
		);
	});

	it("reorders games with the move up and move down buttons", async () => {
		const user = userEvent.setup();
		await renderLists();
		await createListWithGames(user);

		expect(
			screen.getByRole("button", { name: "Move Hades up" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Move Hollow Knight down" })
		).toBeDisabled();

		await user.click(
			screen.getByRole("button", { name: "Move Hollow Knight up" })
		);
		expect(rankingTitles()).toEqual(["Hades", "Hollow Knight", "Celeste"]);

		await user.click(
			screen.getByRole("button", { name: "Move Hades down" })
		);
		await untilVisible(() =>
			expect(rankingTitles()).toEqual([
				"Hollow Knight",
				"Hades",
				"Celeste"
			])
		);
		expect(itemReplacements.slice(-2)).toEqual([
			["g1", "g3", "g2"],
			["g3", "g1", "g2"]
		]);
		expect(
			screen.getByRole("button", { name: "Move Hollow Knight up" })
		).toBeDisabled();
	});

	it("removes a game with undo, then commits the removal", async () => {
		const user = userEvent.setup();
		await renderLists();
		await createListWithGames(user);
		const savedOrders = itemReplacements.length;

		await user.click(
			screen.getByRole("button", { name: "Remove Celeste from the list" })
		);
		expect(rankingTitles()).toEqual(["Hades", "Hollow Knight"]);
		expect(
			await screen.findByText("Removed Celeste from the list")
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Undo/ }));
		expect(rankingTitles()).toEqual(["Hades", "Celeste", "Hollow Knight"]);
		expect(itemReplacements).toHaveLength(savedOrders);

		await user.click(
			screen.getByRole("button", { name: "Remove Celeste from the list" })
		);
		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);

		await untilVisible(() =>
			expect(rankingTitles()).toEqual(["Hades", "Hollow Knight"])
		);
		expect(itemReplacements.at(-1)).toEqual(["g1", "g3"]);
		expect(screen.getByText("2 games")).toBeInTheDocument();
	});

	it.todo(
		"keeps the list consistent when a game is reordered during the undo window of a removal (today the reorder saves the list without the removed game, and Undo restores the old order and the game only on screen)"
	);

	it("makes the list private from the edit dialog", async () => {
		const user = userEvent.setup();
		await renderLists();
		await createListWithGames(user);
		expect(screen.getByText("Public")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^Edit$/ }));
		const dialog = await screen.findByRole("dialog", { name: "Edit list" });
		answerPending();
		const visibility = within(dialog).getByRole("switch", {
			name: "Public list"
		});
		expect(visibility).toBeChecked();
		expect(
			within(dialog).getByText(
				"Anyone can find, follow and duplicate it."
			)
		).toBeInTheDocument();

		await user.click(visibility);
		expect(
			within(dialog).getByText("Only you can see it.")
		).toBeInTheDocument();
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await untilVisible(() =>
			expect(screen.getByText("Private")).toBeInTheDocument()
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(listUpdates).toEqual([
			expect.objectContaining({ name: "Metroidvanias", isPublic: false })
		]);
	});
});
