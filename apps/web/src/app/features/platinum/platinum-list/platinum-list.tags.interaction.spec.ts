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
import { type PlatinumEntry } from "../../../core/models";
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
import { PlatinumList } from "./platinum-list";

const api = environment.apiUrl;
const platinumsUrl = `${api}/users/me/platinums`;

const tagsByPlatinumId: Record<string, string[]> = {
	p1: ["cozy", "short"],
	p2: ["cozy"],
	p3: []
};

function platinum(id: string, title: string): PlatinumEntry {
	return {
		id,
		backlogId: null,
		platformId: null,
		platinumedAt: "2026-03-12",
		notes: null,
		platform: null,
		game: { id: `g-${id}`, code: id, title, isDlc: false }
	};
}

describe("PlatinumList tag filter", () => {
	let httpTesting: HttpTestingController;
	let platinums: PlatinumEntry[];
	let myTags: UserTag[];
	const listQueries: URLSearchParams[] = [];
	const exportQueries: URLSearchParams[] = [];

	function paramsOf(req: TestRequest) {
		return new URLSearchParams(req.request.params.toString());
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: myTags } });
		if (url === `${api}/users/me/gift-offers`)
			return req.flush({ data: { offers: [] } });
		if (method === "GET" && url === platinumsUrl) {
			const params = paramsOf(req);
			listQueries.push(params);
			const search = params.get("search")?.toLowerCase();
			const matches = platinums.filter(
				entry =>
					(!search ||
						entry.game.title.toLowerCase().includes(search)) &&
					hasEveryTag(
						tagsByPlatinumId[entry.id],
						params.get("mood_tags")
					)
			);
			return req.flush({
				data: { platinums: matches, total: matches.length }
			});
		}
		if (method === "GET" && url === `${platinumsUrl}/export`) {
			exportQueries.push(paramsOf(req));
			return req.flush(new Blob(["title\n"], { type: "text/csv" }));
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

	function coverTitles() {
		return screen
			.queryAllByRole("checkbox", { name: /^Select (?!all)/ })
			.map(box =>
				box.getAttribute("aria-label")?.replace(/^Select /, "")
			);
	}

	function lastListQuery() {
		return listQueries.at(-1)!;
	}

	async function renderPlatinums(
		initialRoute = "/platinums",
		expected = ["Hades", "Celeste", "Tunic"]
	) {
		await render(PlatinumList, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [{ path: "**", component: PlatinumList }],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() => expect(coverTitles()).toEqual(expected));
	}

	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem("completr.platinums.viewMode", "hardcore");
		platinums = [
			platinum("p1", "Hades"),
			platinum("p2", "Celeste"),
			platinum("p3", "Tunic")
		];
		myTags = [userTag("short", 1), userTag("cozy", 2)];
		listQueries.length = 0;
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

	it("hides the tags picker when you have no tags", async () => {
		myTags = [];
		await renderPlatinums();

		expect(queryTagsPicker()).not.toBeInTheDocument();
	});

	it("filters Platinums by every tag you pick and keeps them in the URL", async () => {
		const user = userEvent.setup();
		await renderPlatinums();

		await pickTags(user, "cozy");
		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Celeste"])
		);
		await user.click(tagOption("short"));

		await untilVisible(() => expect(coverTitles()).toEqual(["Hades"]));
		expect(lastListQuery().get("mood_tags")).toBe("cozy,short");
		expect(lastListQuery().get("offset")).toBe("0");
		await waitFor(() => expect(urlMoodTags()).toBe("cozy,short"));
		expect(tagsPicker()).toHaveAccessibleName("Tags: cozy, short");
	});

	it("ends unfiltered after a double click on the same tag", async () => {
		const user = userEvent.setup();
		await renderPlatinums();
		await openTagsPicker(user);

		await user.dblClick(tagOption("cozy"));

		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Celeste", "Tunic"])
		);
		expect(lastListQuery().has("mood_tags")).toBe(false);
		await waitFor(() => expect(urlMoodTags()).toBeNull());
	});

	it("selects and clears in a rapid burst and ends with the last choice", async () => {
		const user = userEvent.setup();
		await renderPlatinums();
		await openTagsPicker(user);

		await user.click(tagOption("cozy"));
		await user.click(tagOption("short"));
		await user.click(screen.getByRole("button", { name: "Clear" }));
		await user.click(tagOption("short"));

		await untilVisible(() => expect(coverTitles()).toEqual(["Hades"]));
		expect(lastListQuery().get("mood_tags")).toBe("short");
		await waitFor(() => expect(urlMoodTags()).toBe("short"));
	});

	it("cleans up garbage tags in the URL before asking the API", async () => {
		await renderPlatinums("/platinums?mood_tags=,, COZY ,cozy,,", [
			"Hades",
			"Celeste"
		]);

		expect(
			listQueries.every(query => query.get("mood_tags") === "cozy")
		).toBe(true);
		await waitFor(() => expect(urlMoodTags()).toBe("cozy"));
	});

	it("explains when nothing has the tags and clears search and tags at once", async () => {
		const user = userEvent.setup();
		await renderPlatinums("/platinums?mood_tags=short", ["Hades"]);
		await user.type(
			screen.getByRole("textbox", { name: "Filter platinums by title" }),
			"tunic"
		);

		await untilVisible(() =>
			expect(
				screen.getByText(
					"None of your platinums matches your current search, platform or tags."
				)
			).toBeInTheDocument()
		);
		const queriesBefore = listQueries.length;
		await user.click(
			screen.getByRole("button", { name: "Clear search & filter" })
		);

		await untilVisible(() =>
			expect(coverTitles()).toEqual(["Hades", "Celeste", "Tunic"])
		);
		expect(listQueries.length - queriesBefore).toBe(1);
		expect(lastListQuery().has("mood_tags")).toBe(false);
		expect(lastListQuery().has("search")).toBe(false);
		await waitFor(() => expect(urlMoodTags()).toBeNull());
	});

	it("exports Platinums with the selected tags", async () => {
		const user = userEvent.setup();
		Object.assign(URL, {
			createObjectURL: vi.fn(() => "blob:export"),
			revokeObjectURL: vi.fn()
		});
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		await renderPlatinums("/platinums?mood_tags=cozy", [
			"Hades",
			"Celeste"
		]);

		await user.click(screen.getByRole("button", { name: "Export" }));
		const menu = await screen.findByRole("menu", {
			name: "Export Platinums"
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
