import "@testing-library/jest-dom/vitest";

import { type HttpRequest } from "@angular/common/http";
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
import { ToastService } from "../../../core/services/toast";
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
			return ok({ data: { franchises, total: franchises.length } });
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
				{ provide: ToastService, useValue: toast }
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
		it("shows a busy skeleton and then every franchise with the limit of 100", async () => {
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
			expect(listRequests[0].get("limit")).toBe("100");
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
