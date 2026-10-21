import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type VisibilityLevel } from "../../../core/models/user.model";
import { type UserResult } from "../../../core/services/users";
import { UserConnections } from "./user-connections";

@Component({
	selector: "app-user-connections-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class UserConnectionsHost {}

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredUser {
	username: string;
	name: string;
	profileVisibility: VisibilityLevel;
	followers: string[];
	following: string[];
}

const api = environment.apiUrl;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number, type: string): ApiResponse => ({
	status,
	body: { type, title: type }
});

describe("UserConnections characterization", () => {
	let httpTesting: HttpTestingController;
	let users: StoredUser[];
	let unexpectedRequests: string[];

	function findUser(username: string) {
		return users.find(user => user.username === username);
	}

	function toResult(username: string): UserResult {
		const user = findUser(username)!;
		return {
			id: `id-${user.username}`,
			username: user.username,
			name: user.name,
			avatarUrl: null,
			profileVisibility: user.profileVisibility,
			followerCount: user.followers.length,
			isFollowing: false,
			gamesTotal: 0,
			completedTotal: 0,
			featuredGame: null
		};
	}

	function connections(
		username: string,
		kind: "followers" | "following"
	): ApiResponse {
		const user = findUser(username);
		if (!user) return failure(404, "USER_NOT_FOUND");
		if (user.profileVisibility !== "public")
			return failure(403, "USER_PROFILE_PRIVATE");
		return ok({ data: { users: user[kind].map(toResult) } });
	}

	function profile(username: string): ApiResponse {
		const user = findUser(username);
		if (!user) return failure(404, "USER_NOT_FOUND");
		const isPrivate = user.profileVisibility !== "public";
		return ok({
			data: {
				user: {
					id: `id-${user.username}`,
					username: user.username,
					name: user.name,
					role: "user",
					profileVisibility: user.profileVisibility
				},
				isPrivate,
				followerCount: user.followers.length,
				followingCount: user.following.length,
				isFollowing: false,
				backlogs: [],
				backlogTotal: 0,
				backlogStats: {
					not_started: 0,
					playing: 0,
					completed: 0,
					abandoned: 0,
					total: 0
				},
				listsTotal: 0,
				recentActivity: []
			}
		});
	}

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url } = req.request;
		const connectionsMatch = url.match(
			/\/users\/([^/]+)\/(followers|following)$/
		);
		if (method === "GET" && connectionsMatch)
			return connections(
				connectionsMatch[1],
				connectionsMatch[2] as "followers" | "following"
			);
		const profileMatch = url.match(/\/users\/([^/]+)$/);
		if (method === "GET" && profileMatch && url.startsWith(api))
			return profile(profileMatch[1]);
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

	function tabs() {
		return within(screen.getByRole("navigation", { name: "Connections" }));
	}

	function visiblePlayers() {
		return screen
			.queryAllByRole("heading", { level: 3 })
			.map(heading => heading.textContent?.trim());
	}

	async function renderConnections(path: string) {
		await render(UserConnectionsHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{
					path: "user/:username/followers",
					component: UserConnections,
					data: { kind: "followers" }
				},
				{
					path: "user/:username/following",
					component: UserConnections,
					data: { kind: "following" }
				}
			],
			initialRoute: path
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	beforeEach(() => {
		localStorage.clear();
		unexpectedRequests = [];
		users = [
			{
				username: "ada",
				name: "Ada Lovelace",
				profileVisibility: "public",
				followers: ["bob", "cy"],
				following: ["dee", "bob", "cy"]
			},
			{
				username: "bob",
				name: "Bob Ross",
				profileVisibility: "public",
				followers: ["ada"],
				following: ["ada"]
			},
			{
				username: "cy",
				name: "Cy Twombly",
				profileVisibility: "public",
				followers: ["ada"],
				following: ["ada"]
			},
			{
				username: "dee",
				name: "Dee Dee",
				profileVisibility: "public",
				followers: ["ada"],
				following: []
			},
			{
				username: "eve",
				name: "Eve Moneypenny",
				profileVisibility: "private",
				followers: ["ada"],
				following: ["ada"]
			}
		];
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
		it("lists the followers and shows the count of both tabs", async () => {
			await renderConnections("/user/ada/followers");

			await untilVisible(() =>
				expect(visiblePlayers()).toEqual(["Bob Ross", "Cy Twombly"])
			);
			await untilVisible(() => {
				expect(
					tabs().getByRole("link", { name: "Followers 2" })
				).toHaveAttribute("aria-current", "page");
				expect(
					tabs().getByRole("link", { name: "Following 3" })
				).toBeInTheDocument();
			});
			expect(screen.getByText(/players follow/)).toHaveTextContent(
				"2 players follow @ada"
			);
		});

		it("lists the followed players and shows the count of both tabs", async () => {
			await renderConnections("/user/ada/following");

			await untilVisible(() =>
				expect(visiblePlayers()).toEqual([
					"Dee Dee",
					"Bob Ross",
					"Cy Twombly"
				])
			);
			await untilVisible(() => {
				expect(
					tabs().getByRole("link", { name: "Following 3" })
				).toHaveAttribute("aria-current", "page");
				expect(
					tabs().getByRole("link", { name: "Followers 2" })
				).toBeInTheDocument();
			});
		});

		it("switches to the other tab and shows its list", async () => {
			await renderConnections("/user/ada/followers");
			await untilVisible(() =>
				expect(visiblePlayers()).toEqual(["Bob Ross", "Cy Twombly"])
			);

			await userEvent.click(
				tabs().getByRole("link", { name: /Following/ })
			);

			await untilVisible(() =>
				expect(visiblePlayers()).toEqual([
					"Dee Dee",
					"Bob Ross",
					"Cy Twombly"
				])
			);
			await untilVisible(() =>
				expect(
					tabs().getByRole("link", { name: "Followers 2" })
				).toBeInTheDocument()
			);
		});

		it("shows the private state when the connections are not shared", async () => {
			await renderConnections("/user/eve/followers");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", {
						level: 1,
						name: "These connections are private"
					})
				).toBeInTheDocument()
			);
			expect(visiblePlayers()).toEqual([]);
			expect(
				screen.queryByRole("navigation", { name: "Connections" })
			).not.toBeInTheDocument();
		});

		it("shows the not found state for an unknown player", async () => {
			await renderConnections("/user/nobody/following");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", {
						level: 1,
						name: "Player not found"
					})
				).toBeInTheDocument()
			);
			expect(visiblePlayers()).toEqual([]);
		});
	});
});
