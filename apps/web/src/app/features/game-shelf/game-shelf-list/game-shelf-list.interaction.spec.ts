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
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type GameShelfEntry } from "../../../core/models";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { GameShelfList } from "./game-shelf-list";

@Component({
	selector: "app-shelf-host",
	imports: [GameShelfList, ToastContainer],
	template: `<app-game-shelf-list /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class ShelfHost {}

interface BulkCall {
	url: string;
	action: string | null;
	body: unknown;
}

const api = environment.apiUrl;
const shelfUrl = `${api}/users/me/game-shelf`;

function shelfEntry(id: string, gameId: string, title: string): GameShelfEntry {
	return {
		id,
		gameId,
		platformId: "p1",
		isPublic: true,
		game: { id: gameId, code: title.toLowerCase(), title, isDlc: false },
		platform: { id: "p1", abbreviation: "PC" }
	};
}

describe("GameShelfList bulk interaction", () => {
	let httpTesting: HttpTestingController;
	let renderedFixture: ComponentFixture<unknown>;
	let shelf: GameShelfEntry[];
	let favoriteIds: string[];
	let skipIds: Set<string>;
	let failure: number | null;
	let reportedTotal: number | null;
	const bulkCalls: BulkCall[] = [];

	function answerBulk(req: TestRequest) {
		const { url, params, body } = req.request;
		const action = params.get("action");
		bulkCalls.push({ url, action, body });
		if (failure !== null)
			return req.flush({}, { status: failure, statusText: "Error" });
		const payload = body as { ids?: string[]; gameIds?: string[] };
		const ids = payload.ids ?? payload.gameIds ?? [];
		const succeeded = ids.filter(id => !skipIds.has(id));
		const done = new Set(succeeded);
		if (url === `${shelfUrl}/bulk`)
			shelf = shelf.filter(item => !done.has(item.id));
		if (url === `${api}/users/me/favorites/bulk`)
			favoriteIds =
				action === "add"
					? [...new Set([...favoriteIds, ...succeeded])]
					: favoriteIds.filter(id => !done.has(id));
		req.flush({
			data: {
				action,
				succeeded,
				skipped: ids
					.filter(id => skipIds.has(id))
					.map(id => ({ id, code: "NOT_FOUND" }))
			}
		});
	}

	function answer(req: TestRequest) {
		const { method, url, params } = req.request;
		if (method === "POST" && url.endsWith("/bulk")) return answerBulk(req);
		if (method === "GET" && url === shelfUrl) {
			const offset = Number(params.get("offset") ?? 0);
			const page =
				offset > 0 ? [shelfEntry("s9", "g9", "Outer Wilds")] : shelf;
			return req.flush({
				data: { gameShelf: page, total: reportedTotal ?? page.length }
			});
		}
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: favoriteIds } });
		if (url === `${api}/users/me/wishlist/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (url === `${api}/users/me/gift-offers`)
			return req.flush({ data: { offers: [] } });
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

	function rowCheckbox(title: string) {
		return screen.getByRole("checkbox", { name: `Select ${title}` });
	}

	function pageCheckbox() {
		return screen.getByRole("checkbox", {
			name: "Select all games on this page"
		});
	}

	function bar() {
		return within(screen.getByRole("toolbar", { name: "Bulk actions" }));
	}

	function selectionStatus() {
		return screen
			.getAllByRole("status")
			.find(node => node.getAttribute("aria-atomic") === "true")!;
	}

	function toast(message: string) {
		return within(
			screen.getByText(message).closest("[ngpToast]") as HTMLElement
		);
	}

	async function renderShelf() {
		localStorage.setItem("completr.shelf.viewMode", "table");
		const { fixture } = await render(ShelfHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		renderedFixture = fixture;
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(rowCheckbox("Celeste")).toBeInTheDocument()
		);
	}

	beforeEach(() => {
		localStorage.clear();
		shelf = [
			shelfEntry("s1", "g1", "Hades"),
			shelfEntry("s2", "g2", "Celeste"),
			shelfEntry("s3", "g3", "Inside")
		];
		favoriteIds = [];
		skipIds = new Set();
		failure = null;
		reportedTotal = null;
		bulkCalls.length = 0;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
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
	});

	it("filters through the page search scoped to My Shelf", async () => {
		await renderShelf();
		const pageSearch = renderedFixture.debugElement.query(
			By.directive(PageSearch)
		);
		expect(pageSearch.componentInstance.scopeLabel()).toBe("My Shelf");
	});

	it("selects with ranges and the page, clears on Escape and when the page changes", async () => {
		const user = userEvent.setup();
		reportedTotal = 150;
		await renderShelf();

		await user.click(rowCheckbox("Hades"));
		expect(screen.queryAllByRole("dialog")).toEqual([]);
		await user.keyboard("{Shift>}");
		await user.click(rowCheckbox("Inside"));
		await user.keyboard("{/Shift}");
		expect(selectionStatus()).toHaveTextContent("3 games selected");
		expect(pageCheckbox()).toHaveAttribute("aria-checked", "true");

		await user.click(pageCheckbox());
		expect(selectionStatus()).toHaveTextContent("");
		await user.click(rowCheckbox("Celeste"));
		await user.keyboard("{Escape}");
		expect(selectionStatus()).toHaveTextContent("");

		await user.click(rowCheckbox("Celeste"));
		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() =>
			expect(rowCheckbox("Outer Wilds")).toBeInTheDocument()
		);
		expect(selectionStatus()).toHaveTextContent("");
	});

	it("favorites the selected games once even when double clicked, then offers Unfavorite", async () => {
		const user = userEvent.setup();
		favoriteIds = ["g1"];
		await renderShelf();

		await user.click(pageCheckbox());
		await user.dblClick(
			bar().getByRole("button", { name: "Favorite (2)" })
		);
		await untilVisible(() =>
			expect(
				screen.getByText("2 games added to favorites")
			).toBeInTheDocument()
		);
		expect(bulkCalls).toEqual([
			{
				url: `${api}/users/me/favorites/bulk`,
				action: "add",
				body: { gameIds: ["g2", "g3"] }
			}
		]);

		await user.click(pageCheckbox());
		await user.click(bar().getByRole("button", { name: "Unfavorite (3)" }));
		await untilVisible(() => expect(bulkCalls).toHaveLength(2));
		expect(bulkCalls[1].action).toBe("remove");
	});

	it("keeps the games whose favorite failed selected", async () => {
		const user = userEvent.setup();
		skipIds = new Set(["g2"]);
		await renderShelf();

		await user.click(rowCheckbox("Hades"));
		await user.click(rowCheckbox("Celeste"));
		await user.click(bar().getByRole("button", { name: "Favorite (2)" }));
		await untilVisible(() =>
			expect(
				screen.getByText("1 added, 1 couldn't be changed")
			).toBeInTheDocument()
		);
		expect(selectionStatus()).toHaveTextContent("1 game selected");
		expect(rowCheckbox("Celeste")).toHaveAttribute("aria-checked", "true");
	});

	it("reverts the favorites when the request fails", async () => {
		const user = userEvent.setup();
		failure = 500;
		await renderShelf();

		await user.click(rowCheckbox("Hades"));
		await user.click(bar().getByRole("button", { name: "Favorite (1)" }));
		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't update your favorites. Try again.")
			).toBeInTheDocument()
		);
		expect(
			bar().getByRole("button", { name: "Favorite (1)" })
		).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Add Hades to favorites" })
		).toBeInTheDocument();
	});

	it("removes from the shelf with Undo, then commits on Dismiss", async () => {
		const user = userEvent.setup();
		await renderShelf();

		await user.click(rowCheckbox("Hades"));
		await user.click(rowCheckbox("Inside"));
		await user.click(
			bar().getByRole("button", { name: "Remove from shelf (2)" })
		);
		expect(
			screen.queryByRole("checkbox", { name: "Select Hades" })
		).toBeNull();
		await user.click(
			toast("2 games removed from your shelf").getByRole("button", {
				name: /Undo/
			})
		);
		await untilVisible(() =>
			expect(rowCheckbox("Hades")).toBeInTheDocument()
		);
		expect(bulkCalls).toEqual([]);

		await user.click(rowCheckbox("Inside"));
		await user.click(
			bar().getByRole("button", { name: "Remove from shelf (1)" })
		);
		await user.click(
			toast("1 game removed from your shelf").getByRole("button", {
				name: "Dismiss"
			})
		);
		await untilVisible(() => expect(bulkCalls).toHaveLength(1));
		expect(bulkCalls[0]).toEqual({
			url: `${shelfUrl}/bulk`,
			action: "delete",
			body: { ids: ["s3"] }
		});
		expect(shelf.map(item => item.id)).toEqual(["s1", "s2"]);
	});

	it("brings the shelf entries back selected when the delete fails", async () => {
		const user = userEvent.setup();
		failure = 500;
		await renderShelf();

		await user.click(rowCheckbox("Celeste"));
		await user.click(
			bar().getByRole("button", { name: "Remove from shelf (1)" })
		);
		await user.click(
			toast("1 game removed from your shelf").getByRole("button", {
				name: "Dismiss"
			})
		);
		await untilVisible(() =>
			expect(rowCheckbox("Celeste")).toHaveAttribute(
				"aria-checked",
				"true"
			)
		);
		expect(
			screen.getByText("Couldn't remove the selected games. Try again.")
		).toBeInTheDocument();
	});
});
