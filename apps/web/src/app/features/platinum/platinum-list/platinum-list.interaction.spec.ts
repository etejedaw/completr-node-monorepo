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
import { type PlatinumEntry } from "../../../core/models";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { PlatinumList } from "./platinum-list";

@Component({
	selector: "app-platinum-host",
	imports: [PlatinumList, ToastContainer],
	template: `<app-platinum-list /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class PlatinumHost {}

const api = environment.apiUrl;
const platinumsUrl = `${api}/users/me/platinums`;

function platinum(id: string, gameId: string, title: string): PlatinumEntry {
	return {
		id,
		backlogId: null,
		platformId: null,
		platinumedAt: "2026-03-12",
		notes: null,
		platform: null,
		game: { id: gameId, code: title.toLowerCase(), title, isDlc: false }
	};
}

describe("PlatinumList bulk interaction", () => {
	let httpTesting: HttpTestingController;
	let renderedFixture: ComponentFixture<unknown>;
	let platinums: PlatinumEntry[];
	let skipGameIds: Set<string>;
	let failure: number | null;
	let reportedTotal: number | null;
	const bulkCalls: { action: string | null; body: unknown }[] = [];

	function answer(req: TestRequest) {
		const { method, url, params, body } = req.request;
		if (method === "POST" && url === `${platinumsUrl}/bulk`) {
			const action = params.get("action");
			bulkCalls.push({ action, body });
			if (failure !== null)
				return req.flush({}, { status: failure, statusText: "Error" });
			const gameIds = (body as { gameIds: string[] }).gameIds;
			const succeeded = gameIds.filter(id => !skipGameIds.has(id));
			platinums = platinums.filter(
				item => !succeeded.includes(item.game.id)
			);
			return req.flush({
				data: {
					action,
					succeeded,
					skipped: gameIds
						.filter(id => skipGameIds.has(id))
						.map(id => ({ id, code: "PLATINUM_NOT_FOUND" }))
				}
			});
		}
		if (method === "GET" && url === platinumsUrl) {
			const offset = Number(params.get("offset") ?? 0);
			const page =
				offset > 0 ? [platinum("p9", "g9", "Returnal")] : platinums;
			return req.flush({
				data: { platinums: page, total: reportedTotal ?? page.length }
			});
		}
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
			name: "Select all platinums on this page"
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

	async function renderPlatinums(viewMode = "hardcore") {
		localStorage.setItem("completr.platinums.viewMode", viewMode);
		const { fixture } = await render(PlatinumHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: []
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		renderedFixture = fixture;
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(screen.getAllByText("Bloodborne").length).toBeGreaterThan(0)
		);
	}

	beforeEach(() => {
		localStorage.clear();
		platinums = [
			platinum("p1", "g1", "Astro Bot"),
			platinum("p2", "g2", "Bloodborne"),
			platinum("p3", "g3", "Celeste")
		];
		skipGameIds = new Set();
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

	it("filters through the page search scoped to Platinums", async () => {
		await renderPlatinums();
		const pageSearch = renderedFixture.debugElement.query(
			By.directive(PageSearch)
		);
		expect(pageSearch.componentInstance.scopeLabel()).toBe("Platinums");
	});

	it("shows no selection outside the Hardcore view", async () => {
		await renderPlatinums("grid");
		expect(screen.queryAllByRole("checkbox")).toEqual([]);
	});

	it("selects ranges and the page without opening the editor, and clears on Escape and page change", async () => {
		const user = userEvent.setup();
		reportedTotal = 150;
		await renderPlatinums();

		await user.click(rowCheckbox("Astro Bot"));
		await user.keyboard("{Shift>}");
		await user.click(rowCheckbox("Celeste"));
		await user.keyboard("{/Shift}");
		expect(selectionStatus()).toHaveTextContent("3 platinums selected");
		expect(screen.queryAllByRole("dialog")).toEqual([]);

		await user.click(rowCheckbox("Bloodborne"));
		expect(pageCheckbox()).toHaveAttribute("aria-checked", "mixed");
		await user.keyboard("{Escape}");
		expect(selectionStatus()).toHaveTextContent("");

		await user.click(pageCheckbox());
		await user.click(screen.getByRole("button", { name: "Next page" }));
		await untilVisible(() =>
			expect(rowCheckbox("Returnal")).toBeInTheDocument()
		);
		expect(selectionStatus()).toHaveTextContent("");
	});

	it("removes platinums with Undo and sends a single batch of game ids on Dismiss", async () => {
		const user = userEvent.setup();
		await renderPlatinums();

		await user.click(rowCheckbox("Astro Bot"));
		await user.click(rowCheckbox("Celeste"));
		await user.dblClick(
			bar().getByRole("button", { name: "Remove platinum (2)" })
		);
		expect(
			screen.queryByRole("checkbox", { name: "Select Celeste" })
		).toBeNull();
		await user.click(
			toast("2 platinums removed").getByRole("button", { name: /Undo/ })
		);
		await untilVisible(() =>
			expect(rowCheckbox("Celeste")).toBeInTheDocument()
		);
		expect(bulkCalls).toEqual([]);

		await user.click(rowCheckbox("Astro Bot"));
		await user.click(rowCheckbox("Celeste"));
		await user.click(
			bar().getByRole("button", { name: "Remove platinum (2)" })
		);
		await user.click(
			toast("2 platinums removed").getByRole("button", {
				name: "Dismiss"
			})
		);
		await untilVisible(() => expect(bulkCalls).toHaveLength(1));
		expect(bulkCalls[0]).toEqual({
			action: "delete",
			body: { gameIds: ["g1", "g3"] }
		});
		expect(platinums.map(item => item.id)).toEqual(["p2"]);
	});

	it("restores the skipped platinums selected and every one on an HTTP error", async () => {
		const user = userEvent.setup();
		skipGameIds = new Set(["g2"]);
		await renderPlatinums();

		await user.click(rowCheckbox("Astro Bot"));
		await user.click(rowCheckbox("Bloodborne"));
		await user.click(
			bar().getByRole("button", { name: "Remove platinum (2)" })
		);
		await user.click(
			toast("2 platinums removed").getByRole("button", {
				name: "Dismiss"
			})
		);
		await untilVisible(() =>
			expect(rowCheckbox("Bloodborne")).toHaveAttribute(
				"aria-checked",
				"true"
			)
		);
		expect(
			screen.getByText("1 removed, 1 couldn't be changed")
		).toBeInTheDocument();
		expect(
			screen.queryByRole("checkbox", { name: "Select Astro Bot" })
		).toBeNull();

		failure = 500;
		await user.click(
			bar().getByRole("button", { name: "Remove platinum (1)" })
		);
		await user.click(
			toast("1 platinum removed").getByRole("button", { name: "Dismiss" })
		);
		await untilVisible(() =>
			expect(
				screen.getByText(
					"Couldn't remove the selected platinums. Try again."
				)
			).toBeInTheDocument()
		);
		expect(rowCheckbox("Bloodborne")).toHaveAttribute(
			"aria-checked",
			"true"
		);
	});
});
