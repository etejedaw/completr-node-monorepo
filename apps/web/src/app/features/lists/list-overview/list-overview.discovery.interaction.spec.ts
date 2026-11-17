import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type List } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ListOverview } from "./list-overview";

const api = environment.apiUrl;
const viewer = {
	id: "viewer",
	username: "ada",
	email: "ada@example.com",
	role: "user"
};

type Owner = "viewer" | "player" | "admin";

interface StoredList {
	list: List;
	owner: Owner;
}

function makeList(index: number, owner: Owner, isPublic = true): StoredList {
	return {
		owner,
		list: {
			id: `${owner}-${index}`,
			userId: owner,
			name: `${owner} list ${index}`,
			isPublic,
			isOfficial: owner === "admin",
			owner: { username: owner },
			scoreSource: "metacritic",
			durationSource: "hltb",
			items: [],
			previewItems: []
		}
	};
}

function many(count: number, owner: Owner) {
	return Array.from({ length: count }, (_, index) =>
		makeList(index + 1, owner)
	);
}

describe("Lists discovery interaction", () => {
	let httpTesting: HttpTestingController;
	let stored: StoredList[];
	let heldPaths: Set<string>;
	let failingPaths: Set<string>;
	let requestedOffsets: (string | null)[];

	function pageOf(owner: "admin" | "player", req: TestRequest) {
		const limit = Number(req.request.params.get("limit"));
		const offset = Number(req.request.params.get("offset") ?? 0);
		const visible = stored
			.filter(entry => entry.list.isPublic && entry.owner === owner)
			.map(entry => entry.list);
		return {
			lists: visible.slice(offset, offset + limit),
			total: visible.length
		};
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (url === `${api}/users/me`)
			return req.flush({ data: { user: viewer } });
		if (url === `${api}/users/me/gift-offers`)
			return req.flush({ data: { offers: [] } });
		if (method === "GET" && url === `${api}/lists/me`) {
			const own = stored
				.filter(entry => entry.owner === "viewer")
				.map(entry => entry.list);
			return req.flush({
				data: { lists: own, total: own.length, frozen: false }
			});
		}
		if (url === `${api}/lists/following`)
			return req.flush({ data: { lists: [] } });
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		const discovery = url.match(/\/lists\/(official|recent)$/);
		if (discovery) {
			if (discovery[1] === "recent")
				requestedOffsets.push(req.request.params.get("offset"));
			if (failingPaths.has(discovery[1]))
				return req.flush(
					{ title: "Boom" },
					{ status: 500, statusText: "Server Error" }
				);
			return req.flush({
				data: pageOf(
					discovery[1] === "official" ? "admin" : "player",
					req
				)
			});
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function isHeld(url: string) {
		const discovery = url.match(/\/lists\/(official|recent)$/);
		return !!discovery && heldPaths.has(discovery[1]);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(req => !isHeld(req.url))
				.filter(req => !req.cancelled);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	function pendingDiscovery(path: "official" | "recent") {
		return httpTesting.match(req => req.url === `${api}/lists/${path}`);
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function section(name: string) {
		return screen.getByRole("region", { name });
	}

	function cardNames(name: string) {
		return within(section(name))
			.getAllByRole("link")
			.map(link => link.getAttribute("href"));
	}

	async function renderPage() {
		await render(ListOverview, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", children: [] }]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		TestBed.inject(AuthService).loadUser().subscribe();
	}

	beforeEach(() => {
		localStorage.clear();
		stored = [];
		heldPaths = new Set();
		failingPaths = new Set();
		requestedOffsets = [];
	});

	afterEach(() => {
		heldPaths.clear();
		failingPaths.clear();
		answerPending();
		httpTesting.verify();
	});

	it("shows official and community lists after the viewer's own, without repeating the viewer's lists", async () => {
		stored = [
			makeList(1, "viewer"),
			makeList(2, "viewer", false),
			makeList(1, "admin"),
			makeList(1, "player"),
			makeList(2, "player"),
			makeList(3, "player", false)
		];

		await renderPage();
		await untilVisible(() =>
			expect(cardNames("Community")).toEqual([
				"/lists/player-1",
				"/lists/player-2"
			])
		);

		expect(cardNames("Your lists")).toEqual([
			"/lists/viewer-1",
			"/lists/viewer-2"
		]);
		expect(cardNames("Official")).toEqual(["/lists/admin-1"]);
		expect(screen.getAllByText("viewer list 1")).toHaveLength(1);
		const headings = screen
			.getAllByRole("heading", { level: 2 })
			.map(heading => heading.textContent?.trim());
		expect(headings).toEqual(["Your lists", "Official", "Community"]);
	});

	it("asks each section for its own first page", async () => {
		await renderPage();
		heldPaths = new Set(["official", "recent"]);
		answerPending();

		const [official] = pendingDiscovery("official");
		const [recent] = pendingDiscovery("recent");
		expect(official.request.params.get("limit")).toBe("6");
		expect(official.request.params.get("offset")).toBe("0");
		expect(recent.request.params.get("limit")).toBe("12");
		expect(recent.request.params.get("offset")).toBe("0");
		answer(official);
		answer(recent);
	});

	it("hides the official section when there are no official lists and offers people to follow when the community is empty", async () => {
		await renderPage();

		await untilVisible(() =>
			expect(screen.getByText("No community lists yet")).toBeVisible()
		);
		expect(
			screen.queryByRole("region", { name: "Official" })
		).not.toBeInTheDocument();
		expect(
			within(section("Community")).getByRole("link", {
				name: "Find people"
			})
		).toHaveAttribute("href", "/users");
	});

	it("pages through the community and keeps the previous page on screen while the next one loads", async () => {
		stored = many(30, "player");
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(
				within(section("Community")).getByText("1–12 of 30")
			).toBeVisible()
		);

		heldPaths.add("recent");
		await user.click(
			within(section("Community")).getByRole("button", {
				name: "Next page"
			})
		);

		expect(section("Community")).toHaveAttribute("aria-busy", "true");
		expect(cardNames("Community")[0]).toBe("/lists/player-1");
		const [next] = pendingDiscovery("recent");
		expect(next.request.params.get("offset")).toBe("12");

		answer(next);
		await waitFor(() =>
			expect(
				within(section("Community")).getByText("13–24 of 30")
			).toBeVisible()
		);
		expect(cardNames("Community")[0]).toBe("/lists/player-13");
		expect(section("Community")).toHaveAttribute("aria-busy", "false");
	});

	it("lands on a single page when next is double clicked and drops the request it replaced", async () => {
		stored = many(40, "player");
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(
				within(section("Community")).getByText("1–12 of 40")
			).toBeVisible()
		);

		heldPaths.add("recent");
		await user.dblClick(
			within(section("Community")).getByRole("button", {
				name: "Next page"
			})
		);

		const requests = pendingDiscovery("recent");
		const live = requests.filter(req => !req.cancelled);
		expect(live).toHaveLength(1);
		expect(requests.slice(0, -1).every(req => req.cancelled)).toBe(true);
		const offset = Number(live[0].request.params.get("offset"));
		answer(live[0]);

		await waitFor(() =>
			expect(
				within(section("Community")).getByText(
					`${offset + 1}–${offset + 12} of 40`
				)
			).toBeVisible()
		);
		expect(cardNames("Community")[0]).toBe(`/lists/player-${offset + 1}`);
	});

	it("ignores a slow page that answers after the page the user moved on to", async () => {
		stored = many(40, "player");
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(
				within(section("Community")).getByText("1–12 of 40")
			).toBeVisible()
		);
		const pagination = () =>
			within(section("Community")).getByRole("button", {
				name: "Next page"
			});

		heldPaths.add("recent");
		await user.click(pagination());
		const [second] = pendingDiscovery("recent");
		await user.click(
			within(section("Community")).getByRole("button", {
				name: "Last page"
			})
		);
		const [last] = pendingDiscovery("recent");

		expect(second.cancelled).toBe(true);
		expect(last.request.params.get("offset")).toBe("36");
		answer(last);

		await waitFor(() =>
			expect(
				within(section("Community")).getByText("37–40 of 40")
			).toBeVisible()
		);
		expect(cardNames("Community")).toEqual([
			"/lists/player-37",
			"/lists/player-38",
			"/lists/player-39",
			"/lists/player-40"
		]);
	});

	it("falls back to the last page that still exists when lists vanished meanwhile", async () => {
		stored = many(30, "player");
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(
				within(section("Community")).getByText("1–12 of 30")
			).toBeVisible()
		);

		stored = many(10, "player");
		await user.click(
			within(section("Community")).getByRole("button", {
				name: "Last page"
			})
		);

		await untilVisible(() =>
			expect(cardNames("Community")).toHaveLength(10)
		);
		expect(cardNames("Community")[0]).toBe("/lists/player-1");
		expect(
			within(section("Community")).queryByRole("button", {
				name: "Next page"
			})
		).not.toBeInTheDocument();
	});

	it("goes back to the empty state when every community list vanished while paging", async () => {
		stored = many(30, "player");
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(
				within(section("Community")).getByText("1–12 of 30")
			).toBeVisible()
		);

		stored = [];
		await user.click(
			within(section("Community")).getByRole("button", {
				name: "Last page"
			})
		);

		await untilVisible(() =>
			expect(screen.getByText("No community lists yet")).toBeVisible()
		);
		expect(requestedOffsets.slice(-2)).toEqual(["24", "0"]);
	});

	it("shows an error with retry in the failing section only, and recovers on retry", async () => {
		stored = [makeList(1, "admin"), makeList(1, "player")];
		failingPaths.add("recent");
		const user = userEvent.setup();
		await renderPage();

		await untilVisible(() =>
			expect(
				within(section("Community")).getByText(
					"Couldn't load community lists"
				)
			).toBeVisible()
		);
		expect(cardNames("Official")).toEqual(["/lists/admin-1"]);
		expect(
			screen.queryByText("No community lists yet")
		).not.toBeInTheDocument();

		failingPaths.clear();
		await user.click(
			within(section("Community")).getByRole("button", {
				name: "Try again"
			})
		);

		await untilVisible(() =>
			expect(cardNames("Community")).toEqual(["/lists/player-1"])
		);
		expect(
			screen.queryByText("Couldn't load community lists")
		).not.toBeInTheDocument();
	});

	it("keeps the official section with a retry when it fails instead of hiding it", async () => {
		stored = [makeList(1, "admin")];
		failingPaths.add("official");
		const user = userEvent.setup();
		await renderPage();

		await untilVisible(() =>
			expect(
				within(section("Official")).getByText(
					"Couldn't load official lists"
				)
			).toBeVisible()
		);

		failingPaths.clear();
		await user.dblClick(
			within(section("Official")).getByRole("button", {
				name: "Try again"
			})
		);

		await untilVisible(() =>
			expect(cardNames("Official")).toEqual(["/lists/admin-1"])
		);
	});

	it("keeps the list search working alongside the discovery sections", async () => {
		stored = [makeList(1, "player")];
		const user = userEvent.setup();
		await renderPage();
		await untilVisible(() =>
			expect(cardNames("Community")).toEqual(["/lists/player-1"])
		);

		await user.type(
			screen.getByRole("textbox", { name: "Search public lists" }),
			"rogue"
		);

		await waitFor(() => {
			const [search] = httpTesting.match(
				req => req.url === `${api}/lists/search?search=rogue`
			);
			expect(search).toBeDefined();
			search.flush({ data: { lists: [makeList(9, "player").list] } });
		});
		await untilVisible(() =>
			expect(
				within(
					screen.getByRole("region", {
						name: "Public lists matching “rogue”"
					})
				).getByText("player list 9")
			).toBeVisible()
		);
		expect(cardNames("Community")).toEqual(["/lists/player-1"]);
	});
});
