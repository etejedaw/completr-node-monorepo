import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type TagGame } from "../../mood-tags/mood-tags.model";
import { TagGames } from "./tag-games";

@Component({
	selector: "app-tag-games-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class TagGamesHost {}

function tagGame(index: number, players: number): TagGame {
	return {
		id: `g${index}`,
		code: `game-${index}`,
		title: `Game ${String(index).padStart(2, "0")}`,
		ratio: index % 2 === 0 ? 50 + index : null,
		players
	};
}

describe("Tag page interaction", () => {
	let httpTesting: HttpTestingController;
	let gamesByTag: Record<string, TagGame[]>;
	let pageRequests: { tag: string; offset: number }[];
	let heldPages: TestRequest[];
	let holdPages: boolean;
	let failNextPage: boolean;

	function answer(req: TestRequest) {
		const { url, params } = req.request;
		const match = url.match(/\/tags\/([^/]+)\/games$/);
		if (!match) throw new Error(`Unexpected request: ${url}`);
		const tag = decodeURIComponent(match[1]);
		const offset = Number(params.get("offset"));
		const limit = Number(params.get("limit"));
		pageRequests.push({ tag, offset });
		if (holdPages) {
			heldPages.push(req);
			return;
		}
		flushPage(req, tag, offset, limit);
	}

	function flushPage(
		req: TestRequest,
		tag: string,
		offset: number,
		limit: number
	) {
		if (failNextPage) {
			failNextPage = false;
			return req.flush(null, { status: 500, statusText: "Error" });
		}
		const games = gamesByTag[tag] ?? [];
		req.flush({
			data: {
				tag,
				total: games.length,
				games: games.slice(offset, offset + limit)
			}
		});
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled && !heldPages.includes(req));
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

	async function renderPage(route = "/tags/relaxing") {
		const view = await render(TagGamesHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{ path: "tags/:tag", component: TagGames },
				{ path: "tags", children: [] },
				{ path: "games/:code", children: [] }
			],
			initialRoute: route
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return view;
	}

	const gameLinks = () =>
		screen
			.getAllByRole("link")
			.filter(
				link =>
					link.getAttribute("href")?.startsWith("/games/") &&
					link.getAttribute("tabindex") === "-1"
			)
			.map(link => link.textContent?.trim())
			.filter(Boolean);

	beforeEach(() => {
		gamesByTag = {
			relaxing: Array.from({ length: 30 }, (_, i) =>
				tagGame(i + 1, 30 - i)
			),
			"with friends": [tagGame(1, 2)],
			empty: []
		};
		pageRequests = [];
		heldPages = [];
		holdPages = false;
		failNextPage = false;
	});

	afterEach(() => {
		heldPages.forEach(req =>
			req.flush(null, { status: 500, statusText: "x" })
		);
		heldPages = [];
		answerPending();
		httpTesting.verify();
	});

	it("shows the tag, its total and the first page with Ratio and players", async () => {
		await renderPage();

		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { level: 1, name: "relaxing" })
			).toBeInTheDocument()
		);
		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
		expect(gameLinks()[0]).toBe("Game 01");
		expect(screen.getByText("30 players")).toBeInTheDocument();
		expect(screen.getByText("52")).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Showing 24 of 30"
		);
		expect(screen.getByRole("link", { name: /Tags/ })).toHaveAttribute(
			"href",
			"/tags"
		);
	});

	it("loads the next page once even when Load more is double clicked", async () => {
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
		holdPages = true;

		await user.dblClick(screen.getByRole("button", { name: "Load more" }));
		answerPending();

		expect(pageRequests).toEqual([
			{ tag: "relaxing", offset: 0 },
			{ tag: "relaxing", offset: 24 }
		]);
		expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
		holdPages = false;
		const held = heldPages.shift()!;
		flushPage(held, "relaxing", 24, 24);

		await untilVisible(() => expect(gameLinks()).toHaveLength(30));
		expect(
			screen.queryByRole("button", { name: "Load more" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Showing 30 of 30"
		);
	});

	it("keeps the loaded games and offers a retry when the next page fails", async () => {
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
		failNextPage = true;

		await user.click(screen.getByRole("button", { name: "Load more" }));
		await untilVisible(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Couldn't load more games."
			)
		);
		expect(gameLinks()).toHaveLength(24);

		await user.click(screen.getByRole("button", { name: "Try again" }));
		await untilVisible(() => expect(gameLinks()).toHaveLength(30));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not repeat a game that slid into the next page while paging", async () => {
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
		gamesByTag["relaxing"] = [tagGame(99, 40), ...gamesByTag["relaxing"]];

		await user.click(screen.getByRole("button", { name: "Load more" }));

		await untilVisible(() => expect(gameLinks()).toHaveLength(30));
		expect(new Set(gameLinks()).size).toBe(30);
		expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
	});

	it("shows an empty state with a way back to the tags when nobody shares it", async () => {
		await renderPage("/tags/empty");

		await untilVisible(() =>
			expect(
				screen.getByRole("heading", {
					name: "No games with this tag yet"
				})
			).toBeInTheDocument()
		);
		expect(
			screen.getByRole("link", { name: "Browse tags" })
		).toHaveAttribute("href", "/tags");
	});

	it("offers a retry when the first page fails", async () => {
		const user = userEvent.setup();
		failNextPage = true;
		await renderPage();

		await untilVisible(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Couldn't load this tag"
			)
		);
		await user.click(screen.getByRole("button", { name: "Try again" }));

		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
	});

	it("drops a slow page from the previous tag when the user jumps to another tag", async () => {
		await renderPage();
		await untilVisible(() => expect(gameLinks()).toHaveLength(24));
		holdPages = true;
		const router = TestBed.inject(Router);

		screen.getByRole("button", { name: "Load more" }).click();
		answerPending();
		const slowPage = heldPages.shift()!;
		holdPages = false;
		await router.navigateByUrl("/tags/with%20friends");

		await untilVisible(() => expect(gameLinks()).toEqual(["Game 01"]));
		expect(slowPage.cancelled).toBe(true);
		expect(
			screen.getByRole("heading", { level: 1, name: "with friends" })
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("status")).getByText("Showing 1 of 1")
		).toBeInTheDocument();
	});
});
