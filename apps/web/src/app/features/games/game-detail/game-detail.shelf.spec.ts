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

import { environment } from "../../../../environments/environment";
import { GameDetail } from "./game-detail";

@Component({
	selector: "app-game-detail-shelf-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GameDetailShelfHost {}

const api = environment.apiUrl;

function game(id: string, code: string, title: string) {
	return {
		id,
		code,
		title,
		isDlc: false,
		platforms: [],
		genres: [],
		scores: [],
		times: [],
		dlcs: [],
		parentGame: null,
		externalLinks: []
	};
}

describe("GameDetail shelf lookup", () => {
	let http: HttpTestingController;
	let shelfRequests: TestRequest[];
	let holdShelf: Set<string>;

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === `${api}/games/hades`)
			return req.flush({
				data: { game: game("g1", "hades", "Hades") }
			});
		if (method === "GET" && url === `${api}/games/celeste`)
			return req.flush({
				data: { game: game("g2", "celeste", "Celeste") }
			});
		if (url.endsWith("/reviews"))
			return req.flush({ data: { reviews: [] } });
		if (url.endsWith("/lists"))
			return req.flush({ data: { lists: [], myLists: [] } });
		if (url === `${api}/score-sources`)
			return req.flush({ data: { sources: [] } });
		if (url.endsWith("/game-ids"))
			return req.flush({ data: { gameIds: [] } });
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		if (url === `${api}/users/me/game-shelf`) {
			shelfRequests.push(req);
			if (holdShelf.has(req.request.params.get("game_id") ?? "")) return;
			const gameId = req.request.params.get("game_id");
			const entries = gameId === "g2" ? [{ game: { id: "g2" } }] : [];
			return req.flush({
				data: { gameShelf: entries, total: entries.length }
			});
		}
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		return req.flush({ data: { games: [], total: 0 } });
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = http.match(() => true).filter(r => !r.cancelled);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	beforeEach(() => {
		shelfRequests = [];
		holdShelf = new Set();
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
		vi.unstubAllGlobals();
	});

	async function readLibraryMenu() {
		await userEvent.click(
			await screen.findByRole("button", { name: "More library actions" })
		);
		const menu = await screen.findByRole("menu");
		return within(menu)
			.getAllByRole("menuitem")
			.map(item => item.textContent?.trim())
			.join(" | ");
	}

	it("asks the API only for the opened game instead of a page of the shelf", async () => {
		await render(GameDetailShelfHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/celeste"
		});
		http = TestBed.inject(HttpTestingController);

		await waitFor(() => {
			answerPending();
			expect(shelfRequests).toHaveLength(1);
		});

		const params = shelfRequests[0]!.request.params;
		expect(params.get("game_id")).toBe("g2");
		expect(params.get("limit")).toBe("1");
		expect(await readLibraryMenu()).toMatch(/On My Shelf/);
	});

	it("offers to add a game whose filtered answer is empty", async () => {
		await render(GameDetailShelfHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/hades"
		});
		http = TestBed.inject(HttpTestingController);
		await waitFor(() => {
			answerPending();
			expect(shelfRequests).toHaveLength(1);
		});

		expect(await readLibraryMenu()).toMatch(/Add to My Shelf/);
	});

	it("ignores a late shelf answer of the previous game", async () => {
		holdShelf.add("g2");
		await render(GameDetailShelfHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/celeste"
		});
		http = TestBed.inject(HttpTestingController);
		await waitFor(() => {
			answerPending();
			expect(shelfRequests).toHaveLength(1);
		});

		holdShelf.delete("g2");
		await TestBed.inject(Router).navigateByUrl("/games/hades");
		await waitFor(() => {
			answerPending();
			expect(
				screen.getByRole("heading", { level: 1, name: "Hades" })
			).toBeInTheDocument();
		});
		expect(shelfRequests[0]!.cancelled).toBe(true);
		expect(await readLibraryMenu()).not.toMatch(/On My Shelf/);
	});
});
