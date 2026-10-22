import "@testing-library/jest-dom/vitest";

import { provideHttpClient, withInterceptors } from "@angular/common/http";
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
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { errorInterceptor } from "../../../core/interceptors/error.interceptor";
import { AuthService } from "../../../core/services/auth";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { GameDetail } from "./game-detail";

@Component({
	selector: "app-game-detail-admin-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GameDetailAdminHost {}

const api = environment.apiUrl;
const admin = {
	id: "u1",
	username: "root",
	email: "root@example.com",
	role: "admin"
};
const hades = {
	id: "g1",
	code: "hades",
	title: "Hades",
	isDlc: false,
	platforms: [],
	genres: [],
	scores: [],
	times: [],
	dlcs: [],
	parentGame: null,
	externalLinks: []
};

const IN_USE_MESSAGE =
	"This game can't be deleted because users have data on it (backlog, lists, reviews, etc.) or it has variants or DLC. Deactivate it instead to hide it without losing data.";
const NOT_FOUND_MESSAGE =
	"This game no longer exists or is already inactive. Refresh the page to see its current state.";

describe("GameDetail admin action errors", () => {
	let httpTesting: HttpTestingController;
	let deleteResponse: { status: number; type: string; title: string };

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (url === `${api}/users/me`)
			return req.flush({ data: { user: admin } });
		if (method === "GET" && url === `${api}/games/hades`)
			return req.flush({ data: { game: hades } });
		if (method === "DELETE" && url.startsWith(`${api}/games/g1`))
			return req.flush(
				{ type: deleteResponse.type, title: deleteResponse.title },
				{ status: deleteResponse.status, statusText: "err" }
			);
		if (url === `${api}/games/g1/reviews`)
			return req.flush({ data: { reviews: [] } });
		if (url === `${api}/games/g1/lists`)
			return req.flush({ data: { lists: [], myLists: [] } });
		if (url === `${api}/score-sources`)
			return req.flush({ data: { sources: [] } });
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (url === `${api}/users/me/wishlist/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (method === "GET" && url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		if (url === `${api}/users/me/game-shelf`)
			return req.flush({ data: { gameShelf: [], total: 0 } });
		if (url === `${api}/users/me/queue`)
			return req.flush({ data: { queue: [], total: 0 } });
		if (url.endsWith("/mood-tags"))
			return req.flush({ data: { tags: [] } });
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

	async function renderAsAdmin() {
		const { fixture } = await render(GameDetailAdminHost, {
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting()
			],
			routes: [{ path: "games/:code", component: GameDetail }],
			initialRoute: "/games/hades"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		TestBed.inject(AuthService).loadUser().subscribe();
		await untilVisible(() =>
			expect(
				screen.getByRole("button", { name: "Deactivate" })
			).toBeInTheDocument()
		);
	}

	beforeEach(() => {
		localStorage.clear();
		deleteResponse = { status: 500, type: "", title: "" };
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
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(Element.prototype, "getAnimations");
	});

	it("suggests deactivating when a hard delete hits GAME_IN_USE", async () => {
		const user = userEvent.setup();
		deleteResponse = {
			status: 409,
			type: "GAME_IN_USE",
			title: "Game is referenced by other games or backlogs and cannot be deleted"
		};
		await renderAsAdmin();

		const toastsBefore = screen.queryAllByText(IN_USE_MESSAGE).length;

		await user.click(screen.getByRole("button", { name: "Delete" }));
		await user.click(screen.getByRole("button", { name: "Yes, delete" }));

		await untilVisible(() =>
			expect(screen.getAllByText(IN_USE_MESSAGE)).toHaveLength(
				toastsBefore + 1
			)
		);
		expect(
			screen.getByRole("button", { name: "Deactivate" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Yes, delete" })
		).not.toBeInTheDocument();
	});

	it("explains a missing game when deactivating one that no longer exists", async () => {
		const user = userEvent.setup();
		deleteResponse = {
			status: 404,
			type: "GAME_NOT_FOUND",
			title: "Game not found"
		};
		await renderAsAdmin();

		const toastsBefore = screen.queryAllByText(NOT_FOUND_MESSAGE).length;

		await user.click(screen.getByRole("button", { name: "Deactivate" }));
		await user.click(screen.getByRole("button", { name: "Yes" }));

		await untilVisible(() =>
			expect(screen.getAllByText(NOT_FOUND_MESSAGE)).toHaveLength(
				toastsBefore + 1
			)
		);
		expect(
			screen.getByRole("button", { name: "Deactivate" })
		).toBeInTheDocument();
	});

	it("explains a missing game when hard deleting one that no longer exists", async () => {
		const user = userEvent.setup();
		deleteResponse = {
			status: 404,
			type: "GAME_NOT_FOUND",
			title: "Game not found"
		};
		await renderAsAdmin();

		const toastsBefore = screen.queryAllByText(NOT_FOUND_MESSAGE).length;

		await user.click(screen.getByRole("button", { name: "Delete" }));
		await user.click(screen.getByRole("button", { name: "Yes, delete" }));

		await untilVisible(() =>
			expect(screen.getAllByText(NOT_FOUND_MESSAGE)).toHaveLength(
				toastsBefore + 1
			)
		);
	});

	it("falls back to a generic message for unmapped failures", async () => {
		const user = userEvent.setup();
		await renderAsAdmin();
		const toastsBefore = screen.queryAllByText(
			"Could not delete game."
		).length;

		await user.click(screen.getByRole("button", { name: "Delete" }));
		await user.click(screen.getByRole("button", { name: "Yes, delete" }));

		await untilVisible(() =>
			expect(
				screen.getAllByText("Could not delete game.")
			).toHaveLength(toastsBefore + 1)
		);
	});
});
