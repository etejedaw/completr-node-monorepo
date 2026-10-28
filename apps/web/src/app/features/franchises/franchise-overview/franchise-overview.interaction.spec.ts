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
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { type FranchiseSummary } from "../franchises";
import { FranchiseOverview } from "./franchise-overview";

@Component({
	selector: "app-franchises-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class FranchisesHost {}

const api = environment.apiUrl;
const franchisesUrl = `${api}/franchises`;
const trackUrlPattern = /\/franchises\/([^/]+)\/track$/;
const NETWORK_ERROR = 0;

function saga(name: string, gameCount: number): FranchiseSummary {
	const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return {
		id: `f-${code}`,
		name,
		code,
		description: null,
		gameCount,
		isTracked: false,
		previewGames: Array.from(
			{ length: Math.min(gameCount, 4) },
			(_, index) => ({
				id: `${code}-${index}`,
				code: `${code}-${index}`,
				title: `${name} ${index + 1}`,
				backgroundUrl: null
			})
		)
	};
}

const NAMED_SAGAS = [
	saga("Dark Souls", 4),
	saga("Metroid", 3),
	saga("Okami", 1),
	saga("Resident Evil", 8),
	saga("The Legend of Zelda", 5)
];

describe("Sagas interaction", () => {
	let httpTesting: HttpTestingController;
	let catalog: FranchiseSummary[];
	let trackedCodes: Set<string>;
	let listQueries: { search: string | null; offset: number }[];
	let trackCalls: { method: string; code: string }[];
	let trackFailures: number[];
	let listFailures: number[];

	function answerList(req: TestRequest) {
		const params = req.request.params;
		const search = params.get("search");
		const offset = Number(params.get("offset") ?? 0);
		const limit = Number(params.get("limit") ?? 24);
		listQueries.push({ search, offset });
		const failure = listFailures.shift();
		if (failure !== undefined) return fail(req, failure);
		const matches = catalog.filter(
			franchise =>
				!search ||
				franchise.name.toLowerCase().includes(search.toLowerCase())
		);
		return req.flush({
			data: {
				franchises: matches
					.slice(offset, offset + limit)
					.map(franchise => ({
						...franchise,
						isTracked: trackedCodes.has(franchise.code)
					})),
				total: matches.length
			}
		});
	}

	function fail(req: TestRequest, status: number) {
		if (status === NETWORK_ERROR)
			return req.error(new ProgressEvent("error"));
		return req.flush(null, { status, statusText: "Error" });
	}

	function answerTrack(req: TestRequest, code: string) {
		const { method } = req.request;
		trackCalls.push({ method, code });
		const failure = trackFailures.shift();
		if (failure !== undefined) return fail(req, failure);
		if (method === "POST") trackedCodes.add(code);
		else trackedCodes.delete(code);
		return req.flush(null, { status: 204, statusText: "No Content" });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === franchisesUrl) return answerList(req);
		const trackMatch = url.match(trackUrlPattern);
		if (trackMatch) return answerTrack(req, trackMatch[1]);
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

	async function takeSearchRequest(search: string) {
		let target: TestRequest | undefined;
		await waitFor(() => {
			const pending = pendingRequests();
			target ??= pending.find(
				req => req.request.params.get("search") === search
			);
			pending.filter(req => req !== target).forEach(answer);
			expect(target).toBeDefined();
		});
		return target!;
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function searchInput() {
		return screen.getByRole("textbox", { name: "Search sagas" });
	}

	function cardOf(name: string) {
		return within(
			screen
				.getByRole("heading", { name })
				.closest("article") as HTMLElement
		);
	}

	function trackButtonOf(name: string) {
		return cardOf(name).getByRole("button", {
			name: new RegExp(`^(Track|Tracking) ${name}$`)
		});
	}

	function shownSagas() {
		return screen
			.queryAllByRole("heading", { level: 3 })
			.map(heading => heading.textContent?.trim());
	}

	function searchTo(value: string) {
		fireEvent.input(searchInput(), { target: { value } });
	}

	async function renderSagas() {
		const { fixture } = await render(FranchisesHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{ path: "franchises", component: FranchiseOverview },
				{ path: "franchises/:code", children: [] },
				{ path: "games", children: [] }
			],
			initialRoute: "/franchises"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
	}

	async function renderLoadedSagas() {
		await renderSagas();
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { name: catalog[0].name })
			).toBeInTheDocument()
		);
	}

	beforeEach(() => {
		catalog = [...NAMED_SAGAS];
		trackedCodes = new Set();
		listQueries = [];
		trackCalls = [];
		trackFailures = [];
		listFailures = [];
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
	});

	it("lists every saga with its game count, a link to its page and no progress", async () => {
		await renderLoadedSagas();

		expect(shownSagas()).toEqual(
			NAMED_SAGAS.map(franchise => franchise.name)
		);
		expect(
			cardOf("Resident Evil").getByText(/8\s+games/)
		).toBeInTheDocument();
		expect(cardOf("Okami").getByText(/1\s+game$/)).toBeInTheDocument();
		expect(
			cardOf("Resident Evil").getByRole("link", { name: "Resident Evil" })
		).toHaveAttribute("href", "/franchises/resident-evil");
		expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
		expect(listQueries).toEqual([{ search: null, offset: 0 }]);
	});

	it("never offers to create a saga", async () => {
		await renderLoadedSagas();

		expect(
			screen.queryByRole("button", { name: /create|new saga|add saga/i })
		).not.toBeInTheDocument();
	});

	it("explains an empty catalog and points to the games instead", async () => {
		catalog = [];
		await renderSagas();
		await untilVisible(() =>
			expect(screen.getByText("No sagas yet")).toBeInTheDocument()
		);
		expect(
			screen.queryByRole("button", { name: /create|new saga|add saga/i })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Browse games" })
		).toHaveAttribute("href", "/games");
	});

	it("tracks and untracks a saga from its card", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();

		await user.click(trackButtonOf("Resident Evil"));
		await untilVisible(() =>
			expect(trackButtonOf("Resident Evil")).toHaveAttribute(
				"aria-pressed",
				"true"
			)
		);
		expect(trackButtonOf("Resident Evil")).toHaveTextContent("Tracking");

		await user.click(trackButtonOf("Resident Evil"));
		await untilVisible(() =>
			expect(trackButtonOf("Resident Evil")).toHaveAttribute(
				"aria-pressed",
				"false"
			)
		);

		expect(trackCalls).toEqual([
			{ method: "POST", code: "resident-evil" },
			{ method: "DELETE", code: "resident-evil" }
		]);
		expect(trackedCodes.has("resident-evil")).toBe(false);
	});

	it("shows the sagas the user already tracks as tracked", async () => {
		trackedCodes.add("metroid");
		await renderLoadedSagas();

		expect(trackButtonOf("Metroid")).toHaveAttribute(
			"aria-pressed",
			"true"
		);
		expect(trackButtonOf("Okami")).toHaveAttribute("aria-pressed", "false");
	});

	it("sends a single request when the user double or triple clicks Track", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();

		await user.tripleClick(trackButtonOf("Metroid"));
		await user.dblClick(trackButtonOf("Metroid"));

		const trackRequests = pendingRequests().filter(req =>
			trackUrlPattern.test(req.request.url)
		);
		expect(trackRequests).toHaveLength(1);
		expect(trackButtonOf("Metroid")).toBeDisabled();
		expect(trackButtonOf("Metroid")).toHaveAttribute("aria-busy", "true");

		trackRequests.forEach(answer);
		await untilVisible(() =>
			expect(trackButtonOf("Metroid")).toHaveAttribute(
				"aria-pressed",
				"true"
			)
		);
		expect(trackButtonOf("Metroid")).toBeEnabled();
		expect(trackCalls).toEqual([{ method: "POST", code: "metroid" }]);
	});

	it("tracks several sagas at once without one blocking the other", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();

		await user.click(trackButtonOf("Metroid"));
		await user.click(trackButtonOf("Okami"));

		expect(trackButtonOf("Metroid")).toBeDisabled();
		expect(trackButtonOf("Okami")).toBeDisabled();
		expect(trackButtonOf("Dark Souls")).toBeEnabled();

		await untilVisible(() => {
			expect(trackButtonOf("Metroid")).toHaveAttribute(
				"aria-pressed",
				"true"
			);
			expect(trackButtonOf("Okami")).toHaveAttribute(
				"aria-pressed",
				"true"
			);
		});
	});

	it("keeps the saga untracked and explains the failure when tracking fails", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();
		trackFailures.push(500);

		await user.click(trackButtonOf("Dark Souls"));

		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't update Dark Souls. Try again.")
			).toBeInTheDocument()
		);
		expect(trackButtonOf("Dark Souls")).toHaveAttribute(
			"aria-pressed",
			"false"
		);
		expect(trackButtonOf("Dark Souls")).toBeEnabled();

		await user.click(trackButtonOf("Dark Souls"));
		await untilVisible(() =>
			expect(trackButtonOf("Dark Souls")).toHaveAttribute(
				"aria-pressed",
				"true"
			)
		);
	});

	it("keeps the saga tracked when stopping fails offline", async () => {
		const user = userEvent.setup();
		trackedCodes.add("okami");
		await renderLoadedSagas();
		trackFailures.push(NETWORK_ERROR);

		await user.click(trackButtonOf("Okami"));

		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't update Okami. Try again.")
			).toBeInTheDocument()
		);
		expect(trackButtonOf("Okami")).toHaveAttribute("aria-pressed", "true");
		expect(trackedCodes.has("okami")).toBe(true);
	});

	it("drops a saga removed from the catalog while the user was looking at it", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();
		catalog = catalog.filter(franchise => franchise.code !== "metroid");
		trackFailures.push(404);

		await user.click(trackButtonOf("Metroid"));

		await untilVisible(() => {
			expect(
				screen.getByText("Metroid is no longer in the catalog.")
			).toBeInTheDocument();
			expect(shownSagas()).not.toContain("Metroid");
		});
		expect(listQueries).toHaveLength(2);
	});

	it("searches only the last query when the user types fast", async () => {
		await renderLoadedSagas();

		for (const typed of ["r", "re", "res", "resi", "resident"])
			searchTo(typed);

		await untilVisible(() =>
			expect(shownSagas()).toEqual(["Resident Evil"])
		);
		expect(listQueries.map(query => query.search)).toEqual([
			null,
			"resident"
		]);
	});

	it("ignores a slow response that arrives after a newer search", async () => {
		await renderLoadedSagas();

		searchTo("zelda");
		const slowRequest = await takeSearchRequest("zelda");

		searchTo("metroid");
		await waitFor(() => expect(slowRequest.cancelled).toBe(true));

		await untilVisible(() => expect(shownSagas()).toEqual(["Metroid"]));
	});

	it("keeps the current sagas on screen while a new search loads", async () => {
		await renderLoadedSagas();

		searchTo("okami");
		const okamiRequest = await takeSearchRequest("okami");

		expect(shownSagas()).toEqual(
			NAMED_SAGAS.map(franchise => franchise.name)
		);
		expect(screen.getByRole("region", { name: "Sagas" })).toHaveAttribute(
			"aria-busy",
			"true"
		);

		answer(okamiRequest);
		await untilVisible(() => expect(shownSagas()).toEqual(["Okami"]));
	});

	it("treats a blank search as no search", async () => {
		await renderLoadedSagas();

		searchTo("   ");

		await new Promise(resolve => setTimeout(resolve, 400));
		answerPending();
		expect(listQueries).toEqual([{ search: null, offset: 0 }]);
		expect(shownSagas()).toEqual(
			NAMED_SAGAS.map(franchise => franchise.name)
		);
	});

	it("trims the search before sending it", async () => {
		await renderLoadedSagas();

		searchTo("  metroid  ");

		await untilVisible(() => expect(shownSagas()).toEqual(["Metroid"]));
		expect(listQueries.at(-1)).toEqual({ search: "metroid", offset: 0 });
	});

	it("shows HTML typed in the search as plain text and offers a way back", async () => {
		const user = userEvent.setup();
		await renderLoadedSagas();
		const markup = "<img src=x onerror=alert(1)>";

		searchTo(markup);

		await untilVisible(() =>
			expect(screen.getByText("No matches found")).toBeInTheDocument()
		);
		expect(
			screen.getByText(`No sagas match “${markup}”. Try another name.`)
		).toBeInTheDocument();
		expect(document.querySelector("img[src='x']")).toBeNull();

		const noMatches = screen
			.getByText("No matches found")
			.closest("ui-empty-state") as HTMLElement;
		await user.click(
			within(noMatches).getByRole("button", { name: "Clear search" })
		);

		await untilVisible(() =>
			expect(shownSagas()).toEqual(
				NAMED_SAGAS.map(franchise => franchise.name)
			)
		);
		expect(searchInput()).toHaveValue("");
	});

	it("handles emoji and very long searches without breaking", async () => {
		await renderLoadedSagas();

		searchTo("🎮🔥");
		await untilVisible(() =>
			expect(screen.getByText("No matches found")).toBeInTheDocument()
		);

		for (let length = 1; length <= 120; length++)
			searchTo("z".repeat(length));
		await untilVisible(() =>
			expect(listQueries.at(-1)?.search).toBe("z".repeat(120))
		);
		expect(listQueries.map(query => query.search)).toEqual([
			null,
			"🎮🔥",
			"z".repeat(120)
		]);
	});

	it("pages through the sagas and goes back to the first page on a new search", async () => {
		const user = userEvent.setup();
		catalog = Array.from({ length: 30 }, (_, index) =>
			saga(`Saga ${String(index + 1).padStart(2, "0")}`, 2)
		);
		await renderLoadedSagas();

		expect(shownSagas()).toHaveLength(24);

		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() =>
			expect(shownSagas()).toEqual([
				"Saga 25",
				"Saga 26",
				"Saga 27",
				"Saga 28",
				"Saga 29",
				"Saga 30"
			])
		);

		searchTo("saga 0");
		await untilVisible(() => expect(shownSagas()).toHaveLength(9));
		expect(listQueries.map(query => query.offset)).toEqual([0, 24, 0]);
	});

	it("keeps a tracked state after paging away and back", async () => {
		const user = userEvent.setup();
		catalog = Array.from({ length: 30 }, (_, index) =>
			saga(`Saga ${String(index + 1).padStart(2, "0")}`, 2)
		);
		await renderLoadedSagas();

		await user.click(trackButtonOf("Saga 01"));
		await untilVisible(() =>
			expect(trackButtonOf("Saga 01")).toHaveAttribute(
				"aria-pressed",
				"true"
			)
		);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() => expect(shownSagas()).toContain("Saga 25"));
		await user.click(screen.getByRole("button", { name: "Previous page" }));

		await untilVisible(() =>
			expect(trackButtonOf("Saga 01")).toHaveAttribute(
				"aria-pressed",
				"true"
			)
		);
	});

	it("recovers from a failed load with Try again", async () => {
		const user = userEvent.setup();
		listFailures.push(500);
		await renderSagas();

		await untilVisible(() =>
			expect(screen.getByText("Couldn't load sagas")).toBeInTheDocument()
		);

		await user.click(screen.getByRole("button", { name: "Try again" }));

		await untilVisible(() =>
			expect(shownSagas()).toEqual(
				NAMED_SAGAS.map(franchise => franchise.name)
			)
		);
	});

	it("shows skeletons instead of an empty page on the first load", async () => {
		await renderSagas();

		expect(screen.getByLabelText("Loading sagas")).toHaveAttribute(
			"aria-busy",
			"true"
		);
		expect(screen.queryByText("No sagas yet")).not.toBeInTheDocument();
	});
});
