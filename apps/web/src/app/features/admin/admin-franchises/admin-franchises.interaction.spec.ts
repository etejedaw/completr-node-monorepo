import "@testing-library/jest-dom/vitest";

import { type HttpRequest } from "@angular/common/http";
import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { Subject } from "rxjs";

import { environment } from "../../../../environments/environment";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { AdminFranchises } from "./admin-franchises";

type ResponseBody = Parameters<TestRequest["flush"]>[0];

interface ApiResponse {
	status: number;
	body: ResponseBody;
}

interface StoredFranchise {
	id: string;
	name: string;
	code: string;
	description: string | null;
}

const api = environment.apiUrl;
const franchisesUrl = `${api}/franchises`;

const ok = (body: ResponseBody): ApiResponse => ({ status: 200, body });
const failure = (status: number): ApiResponse => ({
	status,
	body: { type: "ERROR", title: "ERROR" }
});

function franchise(
	id: string,
	name: string,
	description: string | null = null
): StoredFranchise {
	return {
		id,
		name,
		code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
		description
	};
}

describe("AdminFranchises interaction", () => {
	let httpTesting: HttpTestingController;
	let franchises: StoredFranchise[];
	let held: (request: HttpRequest<unknown>) => boolean;
	let nextListFailure: ApiResponse | null;
	let deleteFailure: ApiResponse | null;
	let unexpectedRequests: string[];
	let dialogs: { open: ReturnType<typeof vi.fn> } | null;
	const listRequests: URLSearchParams[] = [];
	const deletions: string[] = [];
	const toast = {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	};

	function handle(req: TestRequest): ApiResponse | null {
		const { method, url, params } = req.request;
		if (method === "GET" && url === franchisesUrl) {
			listRequests.push(new URLSearchParams(params.toString()));
			if (nextListFailure) {
				const response = nextListFailure;
				nextListFailure = null;
				return response;
			}
			const search = params.get("search")?.toLowerCase() ?? "";
			const offset = Number(params.get("offset") ?? 0);
			const limit = Number(params.get("limit") ?? franchises.length);
			const matches = franchises.filter(f =>
				f.name.toLowerCase().includes(search)
			);
			return ok({
				data: {
					franchises: matches.slice(offset, offset + limit),
					total: matches.length
				}
			});
		}
		const deleteMatch = url.match(/\/franchises\/([^/?]+)$/);
		if (method === "DELETE" && deleteMatch) {
			deletions.push(deleteMatch[1]);
			if (deleteFailure) return deleteFailure;
			if (!franchises.some(f => f.id === deleteMatch[1]))
				return failure(404);
			franchises = franchises.filter(f => f.id !== deleteMatch[1]);
			return { status: 204, body: null };
		}
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
			const pending = httpTesting.match(req => !held(req));
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

	function rowOf(name: string) {
		return screen.getByRole("link", { name }).closest("li") as HTMLElement;
	}

	function namesOnScreen() {
		return screen
			.queryAllByRole("link")
			.map(link => link.textContent?.trim() ?? "");
	}

	async function openDeleteFor(
		name: string,
		user: ReturnType<typeof userEvent.setup>
	) {
		await user.click(
			within(rowOf(name)).getByRole("button", {
				name: "Delete franchise"
			})
		);
		return screen.findByRole("dialog", { name: `Delete ${name}?` });
	}

	function lastListRequest() {
		return listRequests[listRequests.length - 1];
	}

	function manyFranchises(count: number, prefix = "Saga") {
		return Array.from({ length: count }, (_, index) => {
			const number = String(index + 1).padStart(3, "0");
			return franchise(`${prefix}-${number}`, `${prefix} ${number}`);
		});
	}

	async function renderFranchises(mobile = false) {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: mobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		const view = await render(AdminFranchises, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast },
				...(dialogs
					? [{ provide: DialogService, useValue: dialogs }]
					: [])
			],
			routes: []
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return view;
	}

	async function renderLoaded(mobile = false) {
		const view = await renderFranchises(mobile);
		await untilVisible(() =>
			expect(
				screen.getByRole("link", { name: "Souls" })
			).toBeInTheDocument()
		);
		return view;
	}

	beforeEach(() => {
		franchises = [
			franchise("f1", "Souls", "Dark fantasy action RPGs"),
			franchise("f2", "Zelda"),
			franchise("f3", "Metroid")
		];
		held = () => false;
		nextListFailure = null;
		deleteFailure = null;
		unexpectedRequests = [];
		dialogs = null;
		listRequests.length = 0;
		deletions.length = 0;
		toast.success.mockClear();
		toast.warning.mockClear();
		toast.error.mockClear();
	});

	afterEach(() => {
		try {
			held = () => false;
			answerPending();
			httpTesting.verify();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("listing", () => {
		it("scopes the page search to Admin sagas", async () => {
			const { fixture } = await renderLoaded();

			expect(
				fixture.debugElement
					.query(By.directive(PageSearch))
					.componentInstance.scopeLabel()
			).toBe("Admin sagas");
		});

		it("shows a busy skeleton and then the first page of franchises", async () => {
			await renderFranchises();

			expect(
				screen.getByRole("list", { name: "Loading franchises" })
			).toHaveAttribute("aria-busy", "true");
			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Souls" })
				).toBeInTheDocument()
			);
			expect(namesOnScreen()).toEqual(["Souls", "Zelda", "Metroid"]);
			expect(listRequests[0].get("limit")).toBe("50");
			expect(listRequests[0].get("offset")).toBe("0");
			expect(listRequests[0].has("search")).toBe(false);
			expect(screen.getByText("3")).toBeInTheDocument();
			expect(screen.getByText(/franchises grouping/)).toBeInTheDocument();
			expect(
				screen.getByText("Dark fantasy action RPGs")
			).toBeInTheDocument();
		});

		it("uses the singular for a single franchise", async () => {
			franchises = [franchise("f1", "Souls")];
			await renderLoaded();

			expect(screen.getByText(/^franchise grouping/)).toBeInTheDocument();
		});

		it("links each franchise to its page", async () => {
			await renderLoaded();

			expect(screen.getByRole("link", { name: "Zelda" })).toHaveAttribute(
				"href",
				"/franchises/zelda"
			);
		});

		it("renders names with markup, emoji and very long text as plain text", async () => {
			const longName = "Saga ".repeat(60).trim();
			franchises = [
				franchise("f1", "<b>Bold</b> 🎮 Ñandú"),
				franchise("f2", longName)
			];
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "<b>Bold</b> 🎮 Ñandú" })
				).toBeInTheDocument()
			);

			expect(
				screen.getByRole("link", { name: longName })
			).toBeInTheDocument();
			expect(document.querySelector("b")).toBeNull();
		});

		it("offers the two accessible actions per row", async () => {
			await renderLoaded();

			const row = within(rowOf("Zelda"));
			expect(
				row.getByRole("button", { name: "Edit franchise" })
			).toBeInTheDocument();
			expect(
				row.getByRole("button", { name: "Delete franchise" })
			).toBeInTheDocument();
		});
	});

	describe("search", () => {
		function searchBox() {
			return screen.getByRole("textbox", { name: "Search franchises" });
		}

		function searchRequests() {
			return listRequests.filter(params => params.has("search"));
		}

		it("asks the API once with the trimmed text after a pause", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "  ZEL ");

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Zelda"])
			);
			expect(listRequests).toHaveLength(2);
			expect(lastListRequest().get("search")).toBe("ZEL");
			expect(lastListRequest().get("offset")).toBe("0");
			expect(lastListRequest().get("limit")).toBe("50");
			expect(screen.getByRole("status")).toHaveTextContent(
				"1 match for “ZEL”"
			);
		});

		it("follows a burst of fast typing, deleting and retyping with a single request", async () => {
			const user = userEvent.setup({ delay: null });
			await renderLoaded();

			await user.type(
				searchBox(),
				"metroidx{Backspace}{Backspace}{Backspace}"
			);
			await user.type(
				searchBox(),
				"{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}so"
			);

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Souls"])
			);
			expect(
				searchRequests().map(params => params.get("search"))
			).toEqual(["so"]);
		});

		it("never lets the answer to an older search replace the newer one", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			held = req => req.params.get("search") === "zel";

			await user.type(searchBox(), "zel");
			const stale = await waitFor(() => {
				const [request] = httpTesting.match(
					req => req.params.get("search") === "zel"
				);
				expect(request).toBeDefined();
				return request;
			});
			await user.clear(searchBox());
			await user.type(searchBox(), "met");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Metroid"])
			);

			expect(stale.cancelled).toBe(true);
			held = () => false;
			answerPending();
			expect(namesOnScreen()).toEqual(["Metroid"]);
			expect(searchBox()).toHaveValue("met");
		});

		it("does not ask again when the text is only spaces", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "   ");
			await new Promise(resolve => setTimeout(resolve, 400));
			answerPending();

			expect(namesOnScreen()).toEqual(["Souls", "Zelda", "Metroid"]);
			expect(listRequests).toHaveLength(1);
		});

		it("caps an endless paste at the length the API accepts", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.click(searchBox());
			await user.paste("z".repeat(500));

			await untilVisible(() =>
				expect(screen.getByText("No matches found")).toBeInTheDocument()
			);
			expect(lastListRequest().get("search")).toHaveLength(100);
		});

		it("explains when nothing matches and restores the list at once with Clear search", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "nothing here");

			await untilVisible(() =>
				expect(screen.getByText("No matches found")).toBeInTheDocument()
			);
			expect(
				screen.getByText("No franchises match “nothing here”.")
			).toBeInTheDocument();
			expect(namesOnScreen()).toEqual([]);
			expect(screen.queryByText("No franchises yet")).toBeNull();

			const emptyState = screen
				.getByText("No matches found")
				.closest("ui-empty-state") as HTMLElement;
			await user.click(
				within(emptyState).getByRole("button", { name: "Clear search" })
			);

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Souls", "Zelda", "Metroid"])
			);
			expect(searchBox()).toHaveValue("");
			expect(lastListRequest().has("search")).toBe(false);
		});

		it("sends markup, regex symbols and emoji as plain text", async () => {
			const user = userEvent.setup();
			franchises = [
				franchise("f1", "<b>Bold</b> 🎮"),
				franchise("f2", "Zelda")
			];
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Zelda" })
				).toBeInTheDocument()
			);

			await user.type(searchBox(), "<b>");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["<b>Bold</b> 🎮"])
			);
			expect(lastListRequest().get("search")).toBe("<b>");
			expect(document.querySelector("b")).toBeNull();

			await user.clear(searchBox());
			await user.type(searchBox(), ".*(");
			await untilVisible(() =>
				expect(screen.getByText("No matches found")).toBeInTheDocument()
			);

			await user.clear(searchBox());
			await user.type(searchBox(), "🎮");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["<b>Bold</b> 🎮"])
			);
		});

		it("clears with Escape and with the clear button of the bar", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			await user.type(searchBox(), "zel");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Zelda"])
			);
			await user.keyboard("{Escape}");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Souls", "Zelda", "Metroid"])
			);

			await user.type(searchBox(), "met");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Metroid"])
			);
			await user.click(
				screen.getByRole("button", { name: "Clear search" })
			);
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Souls", "Zelda", "Metroid"])
			);
		});

		it("keeps the search and the toolbar while a delete reloads the list", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			await user.type(searchBox(), "o");
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Souls", "Metroid"])
			);

			const dialog = await openDeleteFor("Souls", user);
			await user.click(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Metroid"])
			);
			expect(searchBox()).toHaveValue("o");
			expect(lastListRequest().get("search")).toBe("o");
			expect(screen.getByText(/franchises grouping/)).toHaveTextContent(
				"2 franchises grouping"
			);
		});

		it("keeps the search and the page after saving in the franchise dialog", async () => {
			const user = userEvent.setup();
			const closed = new Subject<string | undefined>();
			dialogs = {
				open: vi.fn(() => ({ afterClosed: closed.asObservable() }))
			};
			franchises = manyFranchises(120);
			await renderFranchises();
			await untilVisible(() => expect(namesOnScreen()).toHaveLength(50));
			await user.type(searchBox(), "saga 0");
			await untilVisible(() =>
				expect(screen.getByRole("status")).toHaveTextContent(
					"99 matches for “saga 0”"
				)
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 051")
			);
			const before = listRequests.length;

			await user.click(
				within(rowOf("Saga 051")).getByRole("button", {
					name: "Edit franchise"
				})
			);
			franchises[50] = { ...franchises[50], name: "Saga 051 Remastered" };
			closed.next("saved");

			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 051 Remastered")
			);
			expect(listRequests.length - before).toBe(1);
			expect(lastListRequest().get("search")).toBe("saga 0");
			expect(lastListRequest().get("offset")).toBe("50");
			expect(searchBox()).toHaveValue("saga 0");
		});

		it("keeps the toolbar and retries the same search after it fails", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			nextListFailure = failure(500);

			await user.type(searchBox(), "zel");
			await untilVisible(() =>
				expect(
					screen.getByText("Could not load franchises.")
				).toBeInTheDocument()
			);
			expect(searchBox()).toHaveValue("zel");

			await user.click(screen.getByRole("button", { name: "Try again" }));
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Zelda"])
			);
			expect(lastListRequest().get("search")).toBe("zel");
		});

		it("is not offered when there are no franchises or the load failed", async () => {
			franchises = [];
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByText("No franchises yet")
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("textbox")).toBeNull();
		});

		it("is not offered after a failed load", async () => {
			nextListFailure = failure(500);
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByText("Could not load franchises.")
				).toBeInTheDocument()
			);
			expect(screen.queryByRole("textbox")).toBeNull();
		});
	});

	describe("pagination", () => {
		function searchBox() {
			return screen.getByRole("textbox", { name: "Search franchises" });
		}

		async function renderMany(count: number) {
			franchises = manyFranchises(count);
			await renderFranchises();
			await untilVisible(() => expect(namesOnScreen()).toHaveLength(50));
		}

		it("pages through every franchise beyond the first 50", async () => {
			const user = userEvent.setup();
			await renderMany(120);

			expect(screen.getByText("120")).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Last page" }));

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(
					franchises.slice(100).map(f => f.name)
				)
			);
			expect(lastListRequest().get("offset")).toBe("100");
		});

		it("is hidden when everything fits in one page", async () => {
			await renderLoaded();

			expect(
				screen.queryByRole("button", { name: "Next page" })
			).toBeNull();
		});

		it("finds a franchise that lives past the first page", async () => {
			const user = userEvent.setup();
			await renderMany(120);

			await user.type(searchBox(), "saga 117");

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Saga 117"])
			);
			expect(
				screen.queryByRole("button", { name: "Next page" })
			).toBeNull();
		});

		it("goes back to the first page when the search changes", async () => {
			const user = userEvent.setup();
			await renderMany(120);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 051")
			);

			await user.type(searchBox(), "saga");

			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 001")
			);
			expect(lastListRequest().get("offset")).toBe("0");
			expect(lastListRequest().get("search")).toBe("saga");
		});

		it("pages within the matches of a search", async () => {
			const user = userEvent.setup();
			franchises = [
				...manyFranchises(70, "Zelda"),
				...manyFranchises(40, "Metroid")
			];
			await renderFranchises();
			await untilVisible(() => expect(namesOnScreen()).toHaveLength(50));

			await user.type(searchBox(), "zelda");
			await untilVisible(() =>
				expect(screen.getByRole("status")).toHaveTextContent(
					"70 matches for “zelda”"
				)
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(
					franchises.slice(50, 70).map(f => f.name)
				)
			);
			expect(lastListRequest().get("search")).toBe("zelda");
			expect(lastListRequest().get("offset")).toBe("50");
		});

		it("returns to the first page and the whole catalog when the search is cleared", async () => {
			const user = userEvent.setup();
			franchises = manyFranchises(120);
			await renderFranchises();
			await untilVisible(() => expect(namesOnScreen()).toHaveLength(50));
			await user.type(searchBox(), "saga 0");
			await untilVisible(() =>
				expect(screen.getByRole("status")).toHaveTextContent(
					"99 matches for “saga 0”"
				)
			);
			await user.click(screen.getByRole("button", { name: "Next page" }));
			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 051")
			);

			await user.click(
				screen.getByRole("button", { name: "Clear search" })
			);

			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 001")
			);
			expect(lastListRequest().get("offset")).toBe("0");
			expect(lastListRequest().has("search")).toBe(false);
		});

		it("shows only the last page asked for when pages are clicked in a hurry", async () => {
			const user = userEvent.setup();
			await renderMany(120);
			held = req =>
				req.url === franchisesUrl && req.params.get("offset") === "50";

			await user.click(screen.getByRole("button", { name: "Next page" }));
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(namesOnScreen()[0]).toBe("Saga 101")
			);

			held = () => false;
			answerPending();
			expect(namesOnScreen()[0]).toBe("Saga 101");
		});

		it("steps back a page when the only franchise of the last page is deleted", async () => {
			const user = userEvent.setup();
			await renderMany(101);
			await user.click(screen.getByRole("button", { name: "Last page" }));
			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(["Saga 101"])
			);

			const dialog = await openDeleteFor("Saga 101", user);
			await user.click(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(namesOnScreen()).toEqual(
					franchises.slice(50, 100).map(f => f.name)
				)
			);
			expect(lastListRequest().get("offset")).toBe("50");
			expect(screen.queryByText("No franchises yet")).toBeNull();
		});
	});

	describe("empty state", () => {
		it("explains there are no franchises and offers a second way to create one", async () => {
			franchises = [];
			await renderFranchises();

			await untilVisible(() =>
				expect(
					screen.getByText("No franchises yet")
				).toBeInTheDocument()
			);
			expect(
				screen.getAllByRole("button", { name: "New franchise" })
			).toHaveLength(2);
		});

		it("shows the empty state after deleting the only franchise", async () => {
			const user = userEvent.setup();
			franchises = [franchise("f1", "Souls")];
			await renderLoaded();
			const dialog = await openDeleteFor("Souls", user);

			await user.click(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(
					screen.getByText("No franchises yet")
				).toBeInTheDocument()
			);
		});
	});

	describe("load errors", () => {
		it.each([
			["a server error", 500],
			["a network failure", 0],
			["a missing endpoint", 404]
		])(
			"shows the alert on %s and recovers with Try again",
			async (_, status) => {
				const user = userEvent.setup();
				nextListFailure = failure(status);
				await renderFranchises();

				await untilVisible(() =>
					expect(
						screen.getByText(/Could not load franchises/)
					).toBeInTheDocument()
				);
				expect(
					screen.queryByText("No franchises yet")
				).not.toBeInTheDocument();
				await user.click(
					screen.getByRole("button", { name: "Try again" })
				);

				await untilVisible(() =>
					expect(
						screen.getByRole("link", { name: "Souls" })
					).toBeInTheDocument()
				);
			}
		);

		it("sends one request when Try again is clicked several times", async () => {
			const user = userEvent.setup();
			nextListFailure = failure(500);
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByText(/Could not load franchises/)
				).toBeInTheDocument()
			);
			const before = listRequests.length;

			await user.tripleClick(
				screen.getByRole("button", { name: "Try again" })
			);
			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Souls" })
				).toBeInTheDocument()
			);

			expect(listRequests.length - before).toBe(1);
		});

		it("retries with the keyboard", async () => {
			const user = userEvent.setup();
			nextListFailure = failure(500);
			await renderFranchises();
			await untilVisible(() =>
				expect(
					screen.getByRole("button", { name: "Try again" })
				).toBeInTheDocument()
			);

			screen.getByRole("button", { name: "Try again" }).focus();
			await user.keyboard("{Enter}");

			await untilVisible(() =>
				expect(
					screen.getByRole("link", { name: "Souls" })
				).toBeInTheDocument()
			);
		});
	});

	describe("delete dialog", () => {
		it("names the franchise it is about and says the games are kept", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			const dialog = await openDeleteFor("Zelda", user);

			expect(
				within(dialog).getByText(
					/games will be unassigned but not deleted/
				)
			).toBeInTheDocument();
			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeEnabled();
			expect(
				within(dialog).getByRole("button", { name: "Delete" })
			).toBeEnabled();
			expect(deletions).toEqual([]);
		});

		it("closes with Cancel without deleting or reloading", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const before = listRequests.length;
			const dialog = await openDeleteFor("Zelda", user);

			await user.click(
				within(dialog).getByRole("button", { name: "Cancel" })
			);

			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			answerPending();
			expect(deletions).toEqual([]);
			expect(listRequests.length).toBe(before);
			expect(
				screen.getByRole("link", { name: "Zelda" })
			).toBeInTheDocument();
		});

		it("closes with Escape and with the close button", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeleteFor("Zelda", user);
			within(dialog).getByRole("button", { name: "Cancel" }).focus();

			await user.keyboard("{Escape}");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const reopened = await openDeleteFor("Zelda", user);
			await user.click(
				within(reopened).getByRole("button", {
					name: "Close Delete Zelda?"
				})
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(deletions).toEqual([]);
		});

		it("shows the right franchise when opened, cancelled and reopened on another row", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const first = await openDeleteFor("Zelda", user);
			await user.click(
				within(first).getByRole("button", { name: "Cancel" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);

			const second = await openDeleteFor("Metroid", user);
			await user.click(
				within(second).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(toast.success).toHaveBeenCalledWith("Franchise deleted")
			);
			expect(deletions).toEqual(["f3"]);
		});

		it("opens and closes repeatedly without leaving dialogs behind", async () => {
			const user = userEvent.setup();
			await renderLoaded();

			for (let round = 0; round < 4; round++) {
				const dialog = await openDeleteFor("Souls", user);
				await user.click(
					within(dialog).getByRole("button", { name: "Cancel" })
				);
				await waitFor(() =>
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
				);
			}

			expect(screen.queryAllByRole("dialog")).toHaveLength(0);
		});

		it("sends one DELETE on a triple click and then reloads the list without the franchise", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeleteFor("Zelda", user);

			held = req => req.method === "DELETE";
			const confirm = within(dialog).getByRole("button", {
				name: "Delete"
			});
			await user.tripleClick(confirm);
			expect(
				within(dialog).getByRole("button", { name: "Deleting..." })
			).toBeDisabled();
			held = () => false;

			await untilVisible(() =>
				expect(
					screen.queryByRole("link", { name: "Zelda" })
				).not.toBeInTheDocument()
			);
			expect(deletions).toEqual(["f2"]);
			expect(toast.success).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(namesOnScreen()).toEqual(["Souls", "Metroid"]);
		});

		it("ignores Cancel, Escape and the close button while the delete is in flight", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeleteFor("Zelda", user);
			held = req => req.method === "DELETE";
			await user.click(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			expect(
				within(dialog).getByRole("button", { name: "Cancel" })
			).toBeDisabled();
			await user.keyboard("{Escape}");
			await user.click(
				within(dialog).getByRole("button", {
					name: "Close Delete Zelda?"
				})
			);

			expect(
				screen.getByRole("dialog", { name: "Delete Zelda?" })
			).toBeInTheDocument();
			held = () => false;
			await untilVisible(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(deletions).toEqual(["f2"]);
		});

		it("confirms with the keyboard", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			const dialog = await openDeleteFor("Metroid", user);

			within(dialog).getByRole("button", { name: "Delete" }).focus();
			await user.keyboard("{Enter}");

			await untilVisible(() =>
				expect(
					screen.queryByRole("link", { name: "Metroid" })
				).not.toBeInTheDocument()
			);
			expect(deletions).toEqual(["f3"]);
		});

		it.each([
			["a server error", 500],
			["a network failure", 0],
			["a conflict", 409]
		])(
			"reports %s with an error toast, closes the dialog and keeps the row",
			async (_, status) => {
				const user = userEvent.setup();
				await renderLoaded();
				deleteFailure = failure(status);
				const dialog = await openDeleteFor("Zelda", user);

				await user.click(
					within(dialog).getByRole("button", { name: "Delete" })
				);

				await untilVisible(() =>
					expect(toast.error).toHaveBeenCalledWith(
						"Failed to delete franchise"
					)
				);
				await waitFor(() =>
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
				);
				expect(
					screen.getByRole("link", { name: "Zelda" })
				).toBeInTheDocument();
				expect(toast.success).not.toHaveBeenCalled();

				deleteFailure = null;
				const again = await openDeleteFor("Zelda", user);
				expect(
					within(again).getByRole("button", { name: "Delete" })
				).toBeEnabled();
				await user.click(
					within(again).getByRole("button", { name: "Delete" })
				);
				await untilVisible(() =>
					expect(
						screen.queryByRole("link", { name: "Zelda" })
					).not.toBeInTheDocument()
				);
				expect(deletions).toEqual(["f2", "f2"]);
			}
		);

		it("refreshes the list when deleting a franchise that someone else already deleted", async () => {
			const user = userEvent.setup();
			await renderLoaded();
			franchises = franchises.filter(f => f.id !== "f2");
			const dialog = await openDeleteFor("Zelda", user);

			await user.click(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(toast.error).toHaveBeenCalledWith(
					"Failed to delete franchise"
				)
			);
			await untilVisible(() =>
				expect(
					screen.queryByRole("link", { name: "Zelda" })
				).not.toBeInTheDocument()
			);
			expect(namesOnScreen()).toEqual(["Souls", "Metroid"]);
		});

		it("headlines a very long or markup-laden name as plain text", async () => {
			const user = userEvent.setup();
			franchises = [franchise("f1", "<i>Odd</i> " + "x".repeat(200))];
			await renderFranchises();
			const name = franchises[0].name;
			await untilVisible(() =>
				expect(screen.getByRole("link", { name })).toBeInTheDocument()
			);

			const dialog = await openDeleteFor(name, user);

			expect(dialog.querySelector("i")).toBeNull();
		});
	});

	describe("mobile viewport", () => {
		it("groups edit and delete in a menu per row", async () => {
			const user = userEvent.setup();
			await renderLoaded(true);

			await user.click(
				screen.getByRole("button", { name: "Actions for Zelda" })
			);
			const sheet = await screen.findByRole("dialog", { name: "Zelda" });
			await user.click(
				within(sheet).getByRole("button", { name: "Delete franchise" })
			);

			expect(
				await screen.findByRole("dialog", { name: "Delete Zelda?" })
			).toBeInTheDocument();
			expect(screen.queryByRole("dialog", { name: "Zelda" })).toBeNull();
		});

		it("opens the delete dialog once when the menu item is double tapped", async () => {
			const user = userEvent.setup();
			await renderLoaded(true);

			await user.click(
				screen.getByRole("button", { name: "Actions for Zelda" })
			);
			const sheet = await screen.findByRole("dialog", { name: "Zelda" });
			await user.dblClick(
				within(sheet).getByRole("button", { name: "Delete franchise" })
			);

			await screen.findByRole("dialog", { name: "Delete Zelda?" });
			expect(screen.getAllByRole("dialog")).toHaveLength(1);
			expect(deletions).toEqual([]);
		});

		it("deletes a franchise through the same dialog", async () => {
			const user = userEvent.setup();
			await renderLoaded(true);
			const dialog = await openDeleteFor("Zelda", user);

			await user.tripleClick(
				within(dialog).getByRole("button", { name: "Delete" })
			);

			await untilVisible(() =>
				expect(
					screen.queryByRole("link", { name: "Zelda" })
				).not.toBeInTheDocument()
			);
			expect(deletions).toEqual(["f2"]);
		});
	});
});
