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
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type PublicList } from "../services/public-lists.model";
import { UserLists } from "./user-lists";

@Component({
	selector: "app-user-lists-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class UserListsHost {}

type ListsKind = "lists" | "following-lists";

const api = environment.apiUrl;
const listsUrlPattern = /\/users\/([^/]+)\/(lists|following-lists)$/;
const NETWORK_ERROR = 0;

function publicList(id: string, name: string): PublicList {
	return {
		id,
		name,
		scoreSource: "metacritic",
		durationSource: "hltb",
		followerCount: 0,
		isPublic: true,
		previewItems: [
			{
				id: `${id}-item`,
				game: {
					id: `${id}-game`,
					code: `${id}-game`,
					title: `${name} cover`,
					backgroundUrl: `https://img.test/${id}.jpg`
				}
			}
		]
	} as PublicList;
}

function numberedLists(prefix: string, count: number) {
	return Array.from({ length: count }, (_, index) =>
		publicList(`${prefix}-${index + 1}`, `${prefix} ${index + 1}`)
	);
}

interface ListsRequestLog {
	kind: ListsKind;
	limit: string | null;
	offset: string | null;
	search: string | null;
}

describe("User lists interaction", () => {
	let httpTesting: HttpTestingController;
	let created: PublicList[];
	let following: PublicList[];
	let requests: ListsRequestLog[];
	let failures: Record<ListsKind, number[]>;
	let countFailures: Record<ListsKind, number[]>;
	let username: string;
	let knownUsers: Set<string>;

	function fail(req: TestRequest, status: number) {
		if (status === NETWORK_ERROR)
			return req.error(new ProgressEvent("error"));
		return req.flush(
			{ type: status === 403 ? "USER_PRIVATE" : "ERROR" },
			{ status, statusText: "Error" }
		);
	}

	function answerLists(req: TestRequest, owner: string, kind: ListsKind) {
		const params = req.request.params;
		const limit = params.get("limit");
		const offset = Number(params.get("offset") ?? 0);
		const search = params.get("search");
		requests.push({
			kind,
			limit,
			offset: params.get("offset"),
			search
		});
		if (!knownUsers.has(owner)) return fail(req, 404);
		const failure = (limit === "1" ? countFailures : failures)[
			kind
		].shift();
		if (failure !== undefined) return fail(req, failure);

		const source = kind === "lists" ? created : following;
		const words = (search ?? "")
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);
		const matches = source.filter(list =>
			words.every(word => list.name.toLowerCase().includes(word))
		);
		const page = limit
			? matches.slice(offset, offset + Number(limit))
			: matches;
		const data =
			kind === "lists"
				? { lists: page, total: matches.length }
				: { followingLists: page, total: matches.length };
		return req.flush({ data });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		const match = url.match(listsUrlPattern);
		if (method === "GET" && url.startsWith(api) && match)
			return answerLists(req, match[1], match[2] as ListsKind);
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function pendingRequests() {
		return httpTesting.match(() => true).filter(req => !req.cancelled);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = pendingRequests();
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

	function pageRequests() {
		return requests.filter(request => request.limit !== "1");
	}

	function shownLists() {
		return screen
			.queryAllByRole("list")
			.flatMap(list =>
				within(list).queryAllByRole("heading", { level: 3 })
			)
			.map(heading => heading.textContent?.trim());
	}

	function cardLinkOf(name: string) {
		return screen.getByRole("heading", { level: 3, name }).closest("a");
	}

	function tabLink(name: RegExp) {
		return within(
			screen.getByRole("navigation", { name: "Lists" })
		).getByRole("link", { name });
	}

	function searchInput() {
		return screen.getByRole("textbox", { name: /^Search/ });
	}

	function searchTo(value: string) {
		fireEvent.input(searchInput(), { target: { value } });
	}

	async function renderPage(initialRoute = `/user/${username}/lists`) {
		await render(UserListsHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{ path: "user/:username/lists", component: UserLists },
				{ path: "user/:username", children: [] },
				{ path: "lists", children: [] },
				{ path: "lists/:id", children: [] },
				{ path: "users", children: [] }
			],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function renderLoaded(initialRoute?: string) {
		await renderPage(initialRoute);
		await untilVisible(() =>
			expect(shownLists().length).toBeGreaterThan(0)
		);
	}

	beforeEach(() => {
		username = "ada";
		knownUsers = new Set(["ada"]);
		created = numberedLists("Created", 30);
		following = numberedLists("Followed", 3);
		requests = [];
		failures = { lists: [], "following-lists": [] };
		countFailures = { lists: [], "following-lists": [] };
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
	});

	it("shows the first page of created lists with counts on both tabs", async () => {
		await renderLoaded();

		expect(shownLists()).toEqual(
			created.slice(0, 24).map(list => list.name)
		);
		expect(
			screen.getByRole("heading", { level: 1, name: "Lists" })
		).toBeInTheDocument();
		expect(tabLink(/^Created/)).toHaveAttribute("aria-current", "page");
		await untilVisible(() => {
			expect(tabLink(/^Created/)).toHaveTextContent("30");
			expect(tabLink(/^Following/)).toHaveTextContent("3");
		});
		expect(screen.getByText(/lists by @ada/)).toBeInTheDocument();
		expect(pageRequests()).toEqual([
			{ kind: "lists", limit: "24", offset: "0", search: null }
		]);
		expect(cardLinkOf("Created 1")).toHaveAttribute(
			"href",
			"/lists/Created-1?from=ada"
		);
	});

	it("pages through the lists and keeps total from the API", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() =>
			expect(shownLists()).toEqual(
				created.slice(24).map(list => list.name)
			)
		);
		expect(pageRequests().at(-1)).toEqual({
			kind: "lists",
			limit: "24",
			offset: "24",
			search: null
		});
	});

	it("sends one page request when the user double clicks Next", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		await user.dblClick(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() =>
			expect(shownLists()).toEqual(
				created.slice(24).map(list => list.name)
			)
		);
		expect(
			pageRequests().filter(request => request.offset === "24")
		).toHaveLength(1);
	});

	it("opens the Following tab from the URL and switches tabs with links", async () => {
		const user = userEvent.setup();
		await renderLoaded(`/user/${username}/lists?tab=following`);

		expect(shownLists()).toEqual(following.map(list => list.name));
		expect(tabLink(/^Following/)).toHaveAttribute("aria-current", "page");
		expect(screen.getByText(/@ada follows/)).toBeInTheDocument();

		await user.click(tabLink(/^Created/));
		await untilVisible(() => expect(shownLists()[0]).toBe("Created 1"));
		expect(TestBed.inject(Router).url).toBe("/user/ada/lists");
		expect(tabLink(/^Created/)).toHaveAttribute("aria-current", "page");
	});

	it("does not let a slow response of the previous tab overwrite the new tab", async () => {
		const user = userEvent.setup();
		await renderPage();
		let staleCreated: TestRequest | undefined;
		await waitFor(() => {
			staleCreated = pendingRequests().find(
				req =>
					req.request.url.endsWith("/lists") &&
					req.request.params.get("limit") === "24"
			);
			expect(staleCreated).toBeDefined();
		});

		await user.click(tabLink(/^Following/));
		await untilVisible(() =>
			expect(shownLists()).toEqual(following.map(list => list.name))
		);

		expect(staleCreated!.cancelled).toBe(true);
		expect(shownLists()).toEqual(following.map(list => list.name));
	});

	it("resets search and page when the user changes tab", async () => {
		const user = userEvent.setup();
		await renderLoaded();
		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() => expect(shownLists()[0]).toBe("Created 25"));
		searchTo("2");
		await untilVisible(() =>
			expect(pageRequests().at(-1)?.search).toBe("2")
		);

		await user.click(tabLink(/^Following/));
		await untilVisible(() =>
			expect(shownLists()).toEqual(following.map(list => list.name))
		);
		expect(searchInput()).toHaveValue("");
		expect(pageRequests().at(-1)).toEqual({
			kind: "following-lists",
			limit: "24",
			offset: "0",
			search: null
		});
	});

	it("does not apply a search typed on the previous tab to the new one", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		searchTo("zzz");
		await user.click(tabLink(/^Following/));
		await untilVisible(() =>
			expect(shownLists()).toEqual(following.map(list => list.name))
		);
		await new Promise(resolve => setTimeout(resolve, 400));
		answerPending();

		expect(
			pageRequests().filter(request => request.search === "zzz")
		).toEqual([]);
		expect(shownLists()).toEqual(following.map(list => list.name));
	});

	it("searches only the last query when the user types fast", async () => {
		await renderLoaded();

		for (const typed of ["c", "cr", "cre", "created 1", "created 12"])
			searchTo(typed);

		await untilVisible(() => expect(shownLists()).toEqual(["Created 12"]));
		expect(
			pageRequests()
				.map(request => request.search)
				.filter(Boolean)
		).toEqual(["created 12"]);
	});

	it("shows a no-matches state for garbage, emoji or HTML and clears it", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		for (const garbage of [
			"<img src=x onerror=alert(1)>",
			"🎮 zzz",
			"%%%___"
		]) {
			searchTo(garbage);
			await untilVisible(() =>
				expect(pageRequests().at(-1)?.search).toBe(garbage)
			);
		}
		searchTo("<b>nope</b>");
		await untilVisible(() =>
			expect(screen.getByText("No matches found")).toBeInTheDocument()
		);
		expect(document.querySelector("b")).toBeNull();

		const noMatches = screen
			.getByRole("heading", { name: "No matches found" })
			.closest("ui-no-matches") as HTMLElement;
		await user.click(
			within(noMatches).getByRole("button", { name: "Clear search" })
		);
		await untilVisible(() => expect(shownLists()).toHaveLength(24));
		expect(searchInput()).toHaveValue("");
	});

	it("goes back to the last page when the lists shrank under the requested page", async () => {
		const user = userEvent.setup();
		await renderLoaded();
		created = created.slice(0, 10);

		await user.click(screen.getByRole("button", { name: "Next page" }));

		await untilVisible(() =>
			expect(shownLists()).toEqual(created.map(list => list.name))
		);
		expect(pageRequests().map(request => request.offset)).toEqual([
			"0",
			"24",
			"0"
		]);
		expect(
			screen.queryByRole("button", { name: "Next page" })
		).not.toBeInTheDocument();
	});

	it("explains a user without lists and links back", async () => {
		created = [];
		await renderPage();

		await untilVisible(() =>
			expect(screen.getByText("No lists yet")).toBeInTheDocument()
		);
		expect(
			screen.queryByRole("textbox", { name: /^Search/ })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to profile" })
		).toHaveAttribute("href", "/user/ada");
		expect(
			screen.getByRole("link", { name: "Browse lists" })
		).toHaveAttribute("href", "/lists");
	});

	it("shows the private state when the lists are not shared", async () => {
		failures.lists.push(403);
		await renderPage();

		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { name: "These lists are private" })
			).toBeInTheDocument()
		);
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	it("shows the not-found state for an unknown user", async () => {
		username = "ghost";
		await renderPage();

		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { name: "Player not found" })
			).toBeInTheDocument()
		);
	});

	for (const [label, status] of [
		["a server error", 500],
		["a network error", NETWORK_ERROR]
	] as const) {
		it(`offers to try again after ${label} instead of claiming the user is missing`, async () => {
			const user = userEvent.setup();
			failures.lists.push(status);
			await renderPage();

			await untilVisible(() =>
				expect(screen.getByRole("alert")).toHaveTextContent(
					"Couldn't load the lists"
				)
			);
			expect(
				screen.queryByRole("heading", { name: "Player not found" })
			).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Try again" }));
			await untilVisible(() => expect(shownLists()).toHaveLength(24));
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	}

	it("keeps the Following tab usable when only its count fails", async () => {
		countFailures["following-lists"].push(500);
		await renderLoaded();

		expect(tabLink(/^Following/)).not.toHaveTextContent(/\d/);
		expect(shownLists()).toHaveLength(24);
	});
});
