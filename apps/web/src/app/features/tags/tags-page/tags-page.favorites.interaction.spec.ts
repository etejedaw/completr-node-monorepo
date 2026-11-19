import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth";
import { type UserTag } from "../../../core/services/mood-tags.model";
import { ToastService } from "../../../core/services/toast";
import TagsPage from "./tags-page";

const api = environment.apiUrl;

function userTag(tag: string, favoriteOrder: number | null): UserTag {
	return {
		tag,
		usageCount: 2,
		description: null,
		favoriteOrder,
		icon: null,
		color: null
	};
}

describe("Tags page favorites and popular tags", () => {
	let httpTesting: HttpTestingController;
	let fixture: ComponentFixture<TagsPage>;
	let myTags: UserTag[];
	let favoritePuts: string[][];
	let heldPuts: TestRequest[];
	let holdPuts: boolean;
	let failNextPut: number | null;
	let failPopular: boolean;
	let toast: {
		error: ReturnType<typeof vi.fn<(message: string) => void>>;
		success: ReturnType<typeof vi.fn<(message: string) => void>>;
	};

	function savePut(req: TestRequest) {
		if (failNextPut !== null) {
			const status = failNextPut;
			failNextPut = null;
			return req.flush(null, { status, statusText: "Error" });
		}
		const tags = req.request.body.tags as string[];
		myTags = myTags.map(item => ({
			...item,
			favoriteOrder: tags.includes(item.tag)
				? tags.indexOf(item.tag)
				: null
		}));
		req.flush({ data: { tags } });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: myTags } });
		if (method === "PUT" && url === `${api}/users/me/mood-tags/favorites`) {
			favoritePuts.push([...req.request.body.tags]);
			if (holdPuts) {
				heldPuts.push(req);
				return;
			}
			return savePut(req);
		}
		if (url === `${api}/tags/popular`) {
			if (failPopular) {
				failPopular = false;
				return req.flush(null, { status: 500, statusText: "Error" });
			}
			return req.flush({
				data: {
					tags: [
						{ tag: "co-op", games: 12, players: 30 },
						{ tag: "one more turn", games: 1, players: 2 }
					]
				}
			});
		}
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled && !heldPuts.includes(req));
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function respond() {
		answerPending();
		await fixture.whenStable();
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function renderPage() {
		const view = await render(TagsPage, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast },
				{
					provide: AuthService,
					useValue: {
						isPremium: signal(false),
						hasPremiumFeature: () => false
					}
				}
			]
		});
		fixture = view.fixture;
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", { name: "Favorite tags" })
			).toBeInTheDocument()
		);
	}

	const favoritesSection = () =>
		screen.getByRole("region", { name: "Favorite tags" });
	const favoriteOrder = () =>
		within(favoritesSection())
			.queryAllByRole("listitem")
			.map(
				item =>
					within(item)
						.getByRole("button", { name: /^Move .+ up$/ })
						.getAttribute("aria-label")
						?.replace(/^Move (.+) up$/, "$1") ?? ""
			);
	const star = (tag: string) =>
		screen.getByRole("button", { name: `Favorite ${tag}` });

	beforeEach(() => {
		myTags = [
			userTag("cozy", 1),
			userTag("relaxing", 0),
			userTag("short", null),
			userTag("brutal", null),
			userTag("retro", null),
			userTag("story", null)
		];
		favoritePuts = [];
		heldPuts = [];
		holdPuts = false;
		failNextPut = null;
		failPopular = false;
		toast = { error: vi.fn(), success: vi.fn() };
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
		vi.unstubAllGlobals();
		heldPuts.forEach(req => req.flush({ data: { tags: [] } }));
		heldPuts = [];
		answerPending();
		httpTesting.verify();
	});

	it("lists my favorites in their saved order and stars them in my tags", async () => {
		await renderPage();

		expect(favoriteOrder()).toEqual(["relaxing", "cozy"]);
		expect(star("relaxing")).toHaveAttribute("aria-pressed", "true");
		expect(star("short")).toHaveAttribute("aria-pressed", "false");
		expect(
			within(favoritesSection()).getByText(/2\/5/)
		).toBeInTheDocument();
	});

	it("adds a favorite at the end and a double click on the star does not undo it", async () => {
		const user = userEvent.setup();
		holdPuts = true;
		await renderPage();

		await user.dblClick(star("short"));
		await respond();

		expect(favoriteOrder()).toEqual(["relaxing", "cozy", "short"]);
		expect(favoritePuts).toEqual([["relaxing", "cozy", "short"]]);
		savePut(heldPuts.shift()!);
		await respond();
		expect(star("short")).toHaveAttribute("aria-pressed", "true");
		expect(favoritePuts).toHaveLength(1);
	});

	it("reorders with the move buttons and saves the final order after rapid presses", async () => {
		const user = userEvent.setup();
		holdPuts = true;
		myTags = myTags.map((item, index) => ({
			...item,
			favoriteOrder: index < 3 ? index : null
		}));
		await renderPage();
		expect(favoriteOrder()).toEqual(["cozy", "relaxing", "short"]);

		await user.click(screen.getByRole("button", { name: "Move short up" }));
		await user.click(screen.getByRole("button", { name: "Move short up" }));
		await user.click(screen.getByRole("button", { name: "Move short up" }));
		await respond();

		expect(favoriteOrder()).toEqual(["short", "cozy", "relaxing"]);
		expect(
			screen.getByRole("button", { name: "Move short up" })
		).toHaveAttribute("aria-disabled", "true");
		expect(favoritePuts).toEqual([["cozy", "short", "relaxing"]]);
		savePut(heldPuts.shift()!);
		await respond();
		expect(favoritePuts.at(-1)).toEqual(["short", "cozy", "relaxing"]);
		savePut(heldPuts.shift()!);
		await respond();
		expect(favoritePuts).toHaveLength(2);
		expect(
			within(favoritesSection()).getByRole("status")
		).toHaveTextContent("short moved to position 1 of 3.");
	});

	it("moves with the keyboard too", async () => {
		const user = userEvent.setup();
		await renderPage();

		screen.getByRole("button", { name: "Move relaxing down" }).focus();
		await user.keyboard("{Enter}");
		await respond();

		expect(favoriteOrder()).toEqual(["cozy", "relaxing"]);
		expect(favoritePuts).toEqual([["cozy", "relaxing"]]);
	});

	it("stops at 5 favorites and explains why on the remaining stars", async () => {
		const user = userEvent.setup();
		await renderPage();

		for (const tag of ["short", "brutal", "retro"]) {
			await user.click(star(tag));
			await respond();
		}
		await user.click(star("story"));
		await respond();

		expect(favoriteOrder()).toHaveLength(5);
		expect(star("story")).toHaveAttribute("aria-disabled", "true");
		expect(star("story")).toHaveAttribute(
			"title",
			"You can pick up to 5 favorites"
		);
		expect(favoritePuts.at(-1)).toEqual([
			"relaxing",
			"cozy",
			"short",
			"brutal",
			"retro"
		]);
	});

	it("removes a favorite from its row and puts it back when the server fails", async () => {
		const user = userEvent.setup();
		failNextPut = 500;
		await renderPage();

		await user.click(
			screen.getByRole("button", { name: "Remove cozy from favorites" })
		);
		await respond();

		expect(favoriteOrder()).toEqual(["relaxing", "cozy"]);
		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't save your favorite tags. Try again."
		);
	});

	it("links every popular tag to its page with its number of games", async () => {
		await renderPage();

		const popular = screen.getByRole("region", { name: "Popular tags" });
		expect(
			within(popular).getByRole("link", { name: "co-op, 12 games" })
		).toHaveAttribute("href", "/tags/co-op");
		expect(
			within(popular).getByRole("link", { name: "one more turn, 1 game" })
		).toHaveAttribute("href", "/tags/one%20more%20turn");
	});

	it("retries the popular tags when they fail to load", async () => {
		const user = userEvent.setup();
		failPopular = true;
		await renderPage();

		const popular = screen.getByRole("region", { name: "Popular tags" });
		await user.click(
			within(popular).getByRole("button", { name: "Try again" })
		);

		await untilVisible(() =>
			expect(
				within(popular).getByRole("link", { name: "co-op, 12 games" })
			).toBeInTheDocument()
		);
	});
});
