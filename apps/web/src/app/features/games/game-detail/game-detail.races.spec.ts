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
import { render, screen, waitFor } from "@testing-library/angular";

import { environment } from "../../../../environments/environment";
import { GameDetail } from "./game-detail";

@Component({
	selector: "app-game-detail-races-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GameDetailRacesHost {}

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

describe("GameDetail response ordering", () => {
	let http: HttpTestingController;
	let held: TestRequest[];

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === `${api}/games/hades`) {
			held.push(req);
			return;
		}
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
		if (url.endsWith("/tags")) return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		if (url === `${api}/users/me/game-shelf`)
			return req.flush({ data: { gameShelf: [], total: 0 } });
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
		held = [];
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

	it("ignores a slow answer for the previous game after navigating to another one", async () => {
		await render(GameDetailRacesHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/hades"
		});
		http = TestBed.inject(HttpTestingController);
		answerPending();
		expect(held).toHaveLength(1);

		await TestBed.inject(Router).navigateByUrl("/games/celeste");
		await waitFor(() => {
			answerPending();
			expect(
				screen.getByRole("heading", { level: 1, name: "Celeste" })
			).toBeInTheDocument();
		});

		expect(held[0]!.cancelled).toBe(true);
		expect(screen.queryByText("Hades")).not.toBeInTheDocument();
	});
});
