import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry, type QueueEntry } from "../../../core/models";
import { type UserTag } from "../../../core/services/mood-tags.model";
import {
	hasEveryTag,
	openTagsPicker,
	pickTags,
	queryTagsPicker,
	tagOption,
	tagsPicker,
	urlMoodTags,
	userTag
} from "../../../shared/components/my-tag-filter/my-tag-filter.testing";
import { QueueView } from "./queue-view";

const api = environment.apiUrl;
const queueUrl = `${api}/users/me/queue`;

function run(id: string, code: string, title: string): BacklogEntry {
	return {
		id,
		status: "not_started",
		isPublic: true,
		score: 4,
		duration: 20,
		game: { id: `g-${id}`, code, title, isDlc: false },
		platform: { id: "p1", abbreviation: "PC" }
	};
}

const library = [
	run("b1", "hades", "Hades"),
	run("b2", "celeste", "Celeste"),
	run("b3", "hollow-knight", "Hollow Knight"),
	run("b4", "tunic", "Tunic")
];

const tagsByBacklogId: Record<string, string[]> = {
	b1: ["cozy", "short"],
	b2: [],
	b3: ["cozy"],
	b4: ["short"]
};

describe("QueueView tag filter", () => {
	let httpTesting: HttpTestingController;
	let queuedIds: string[];
	let myTags: UserTag[];
	const queueQueries: URLSearchParams[] = [];
	const moves: { backlogId: string; position: unknown }[] = [];
	const exportQueries: URLSearchParams[] = [];

	function queueEntries(): QueueEntry[] {
		return queuedIds.map((backlogId, index) => ({
			id: `q-${backlogId}`,
			position: index + 1,
			backlog: library.find(entry => entry.id === backlogId)!
		}));
	}

	function paramsOf(req: TestRequest) {
		return new URLSearchParams(req.request.params.toString());
	}

	function queuePage(req: TestRequest) {
		const params = paramsOf(req);
		queueQueries.push(params);
		const search = params.get("search")?.toLowerCase();
		const matching = queueEntries().filter(
			entry =>
				(!search ||
					entry.backlog.game.title.toLowerCase().includes(search)) &&
				hasEveryTag(
					tagsByBacklogId[entry.backlog.id],
					params.get("mood_tags")
				)
		);
		return { queue: matching, total: matching.length };
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: myTags } });
		if (url === `${api}/users/me/gift-offers`)
			return req.flush({ data: { offers: [] } });
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (method === "GET" && url === queueUrl)
			return req.flush({ data: queuePage(req) });
		if (method === "GET" && url === `${queueUrl}/export`) {
			exportQueries.push(paramsOf(req));
			return req.flush(new Blob(["title\n"], { type: "text/csv" }));
		}
		if (url === `${queueUrl}/backlog-ids`)
			return req.flush({ data: { backlogIds: queuedIds } });
		const moveMatch = url.match(/\/users\/me\/queue\/([^/]+)\/position$/);
		if (method === "PATCH" && moveMatch) {
			moves.push({ backlogId: moveMatch[1], position: body.position });
			const rest = queuedIds.filter(id => id !== moveMatch[1]);
			rest.splice(body.position - 1, 0, moveMatch[1]);
			queuedIds = rest;
			return req.flush({ data: { queue: queueEntries() } });
		}
		if (method === "PUT" && url === queueUrl) {
			queuedIds = body.backlogIds;
			return req.flush({ data: { queue: queueEntries() } });
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled);
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

	function featuredCards() {
		return screen.queryAllByRole("article");
	}

	function queueOrder() {
		const featured = featuredCards().map(card =>
			within(card)
				.queryAllByRole("link")
				.map(link => link.getAttribute("aria-label"))
				.find(Boolean)
		);
		const rows = screen
			.queryAllByRole("listitem")
			.filter(item => item.closest("ol"))
			.map(item =>
				within(item)
					.getAllByRole("link")
					.map(link => link.getAttribute("aria-label"))
					.find(Boolean)
			);
		return [...featured, ...rows];
	}

	function row(title: string) {
		const item = screen
			.getAllByRole("listitem")
			.find(
				candidate =>
					within(candidate).queryAllByRole("link", { name: title })
						.length > 0
			);
		return within(item as HTMLElement);
	}

	function lastQueueQuery() {
		return queueQueries.at(-1)!;
	}

	async function renderQueue(
		initialRoute = "/queue",
		expectedOrder = ["Hades", "Celeste", "Hollow Knight", "Tunic"]
	) {
		await render(QueueView, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", component: QueueView }],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() => expect(queueOrder()).toEqual(expectedOrder));
	}

	async function pickCozy(user: UserEvent) {
		await pickTags(user, "cozy");
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hades", "Hollow Knight"])
		);
	}

	beforeEach(() => {
		localStorage.clear();
		queuedIds = ["b1", "b2", "b3", "b4"];
		myTags = [userTag("short", 2), userTag("cozy", 2)];
		queueQueries.length = 0;
		moves.length = 0;
		exportQueries.length = 0;
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
	});

	it("sits next to the search and hides when you have no tags", async () => {
		myTags = [];
		await renderQueue();

		expect(queryTagsPicker()).not.toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Filter games by title" })
		).toBeInTheDocument();
	});

	it("filters Up Next by every tag you pick and keeps them in the URL", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await pickCozy(user);
		expect(lastQueueQuery().get("mood_tags")).toBe("cozy");
		expect(lastQueueQuery().get("offset")).toBe("0");
		expect(featuredCards()).toEqual([]);

		await user.click(tagOption("short"));
		await untilVisible(() => expect(queueOrder()).toEqual(["Hades"]));
		expect(lastQueueQuery().get("mood_tags")).toBe("cozy,short");
		await waitFor(() => expect(urlMoodTags()).toBe("cozy,short"));
		expect(tagsPicker()).toHaveAccessibleName("Tags: cozy, short");
	});

	it("moves a game within the tag filter and keeps the rest of the queue on the server", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await pickCozy(user);
		await user.keyboard("{Escape}");

		await user.click(
			row("Hollow Knight").getByRole("button", { name: "Move up" })
		);

		await untilVisible(() => expect(moves).toHaveLength(1));
		expect(moves[0]).toEqual({ backlogId: "b3", position: 1 });
		expect(queuedIds).toEqual(["b3", "b1", "b2", "b4"]);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades"])
		);
	});

	it("moves a game down within the filter past the games it hides", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await pickCozy(user);
		await user.keyboard("{Escape}");

		await user.click(
			row("Hades").getByRole("button", { name: "Move down" })
		);

		await untilVisible(() => expect(moves).toHaveLength(1));
		expect(queuedIds).toEqual(["b2", "b3", "b1", "b4"]);
		expect(queueOrder()).toEqual(["Hollow Knight", "Hades"]);
	});

	it("moves a filtered game to the top of the whole queue once even when double clicked", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await pickCozy(user);
		await user.keyboard("{Escape}");

		await user.dblClick(
			row("Hollow Knight").getByRole("button", { name: "Move to top" })
		);

		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades"])
		);
		expect(moves).toEqual([{ backlogId: "b3", position: 1 }]);
		expect(queuedIds).toEqual(["b3", "b1", "b2", "b4"]);
		expect(lastQueueQuery().get("mood_tags")).toBe("cozy");
	});

	it("ends unfiltered after a double click on the same tag", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await openTagsPicker(user);

		await user.dblClick(tagOption("cozy"));

		await untilVisible(() =>
			expect(queueOrder()).toEqual([
				"Hades",
				"Celeste",
				"Hollow Knight",
				"Tunic"
			])
		);
		expect(lastQueueQuery().has("mood_tags")).toBe(false);
		expect(featuredCards()).toHaveLength(1);
		await waitFor(() => expect(urlMoodTags()).toBeNull());
	});

	it("selects and clears in a rapid burst and ends with the last choice", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await openTagsPicker(user);

		await user.click(tagOption("cozy"));
		await user.click(tagOption("short"));
		await user.click(screen.getByRole("button", { name: "Clear" }));
		await user.click(tagOption("short"));

		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hades", "Tunic"])
		);
		expect(lastQueueQuery().get("mood_tags")).toBe("short");
		await waitFor(() => expect(urlMoodTags()).toBe("short"));
	});

	it("cleans up garbage tags in the URL before asking the API", async () => {
		await renderQueue("/queue?mood_tags=,, COZY ,cozy,,", [
			"Hades",
			"Hollow Knight"
		]);

		expect(
			queueQueries.every(query => query.get("mood_tags") === "cozy")
		).toBe(true);
		await waitFor(() => expect(urlMoodTags()).toBe("cozy"));
		expect(tagsPicker()).toHaveAccessibleName("Tags: cozy");
	});

	it("shows a tag from the URL you no longer have so you can remove it", async () => {
		const user = userEvent.setup();
		await renderQueue("/queue?mood_tags=retired", []);

		expect(tagsPicker()).toHaveAccessibleName("Tags: retired");
		expect(
			screen.queryByRole("heading", { name: "Nothing queued yet" })
		).not.toBeInTheDocument();
		await openTagsPicker(user);
		await user.click(tagOption("retired"));

		await untilVisible(() => expect(queueOrder()).toHaveLength(4));
		await waitFor(() => expect(urlMoodTags()).toBeNull());
	});

	it("explains when nothing has the tags and clears search and tags at once", async () => {
		const user = userEvent.setup();
		await renderQueue();
		await pickCozy(user);
		await user.keyboard("{Escape}");
		await user.type(
			screen.getByRole("textbox", { name: "Filter games by title" }),
			"tunic"
		);

		await untilVisible(() =>
			expect(
				screen.getByText(
					'Nothing in Up Next matches "tunic" with every tag you picked.'
				)
			).toBeInTheDocument()
		);
		const queriesBefore = queueQueries.length;
		await user.click(
			screen.getByRole("button", { name: "Clear search & tags" })
		);

		await untilVisible(() => expect(queueOrder()).toHaveLength(4));
		expect(queueQueries.length - queriesBefore).toBe(1);
		expect(lastQueueQuery().has("mood_tags")).toBe(false);
		expect(lastQueueQuery().has("search")).toBe(false);
		await waitFor(() => expect(urlMoodTags()).toBeNull());
		expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
	});

	it("exports Up Next with the selected tags", async () => {
		const user = userEvent.setup();
		Object.assign(URL, {
			createObjectURL: vi.fn(() => "blob:export"),
			revokeObjectURL: vi.fn()
		});
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		await renderQueue();
		await pickCozy(user);
		await user.keyboard("{Escape}");

		await user.click(screen.getByRole("button", { name: "Export" }));
		const menu = await screen.findByRole("menu", {
			name: "Export Up Next"
		});
		await user.click(
			within(menu).getByRole("menuitem", { name: "Download CSV" })
		);
		await untilVisible(() => expect(exportQueries).toHaveLength(1));

		expect(exportQueries[0].get("mood_tags")).toBe("cozy");
		click.mockRestore();
		Reflect.deleteProperty(URL, "createObjectURL");
		Reflect.deleteProperty(URL, "revokeObjectURL");
	});
});
