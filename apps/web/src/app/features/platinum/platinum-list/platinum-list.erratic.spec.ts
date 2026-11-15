import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject } from "rxjs";

import { type PlatinumEntry } from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { GiftOffersService } from "../../../shared/components/gift-offer-card/gift-offers.service";
import { PlatinumService } from "../platinum";
import { PlatinumList } from "./platinum-list";

type PlatinumsResponse = {
	data: { platinums: PlatinumEntry[]; total: number };
};

function platinum(id: string, title: string): PlatinumEntry {
	return {
		id,
		backlogId: null,
		platformId: null,
		platinumedAt: null,
		notes: null,
		platform: null,
		game: { id: `g-${id}`, code: id, title, isDlc: false }
	};
}

function response(...entries: PlatinumEntry[]): PlatinumsResponse {
	return { data: { platinums: entries, total: entries.length } };
}

describe("PlatinumList erratic loading", () => {
	const platinumService = { getMine: vi.fn() };
	let requests: Subject<PlatinumsResponse>[];

	beforeEach(() => {
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
		localStorage.clear();
		requests = [];
		platinumService.getMine.mockReset().mockImplementation(() => {
			const request = new Subject<PlatinumsResponse>();
			requests.push(request);
			return request;
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	function renderPage() {
		return render(PlatinumList, {
			providers: [
				provideRouter([]),
				{ provide: PlatinumService, useValue: platinumService },
				{ provide: DialogService, useValue: { open: vi.fn() } },
				{ provide: ToastService, useValue: { success: vi.fn() } },
				{
					provide: GiftOffersService,
					useValue: { listOffers: () => of([]) }
				}
			]
		});
	}

	function serverError() {
		return new HttpErrorResponse({ status: 500 });
	}

	it("shows a retryable error instead of the empty state when the API fails", async () => {
		await renderPage();
		requests[0].error(serverError());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load this page"
		);
		expect(screen.queryByText("No platinums yet")).not.toBeInTheDocument();
	});

	it("recovers when retry succeeds after the API failed", async () => {
		const user = userEvent.setup();
		await renderPage();
		requests[0].error(serverError());

		await user.click(
			await screen.findByRole("button", { name: "Try again" })
		);
		requests[1].next(response(platinum("p1", "Astro Bot")));

		expect(
			(await screen.findAllByText("Astro Bot")).length
		).toBeGreaterThan(0);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("keeps only the last request alive when retry is double clicked", async () => {
		const user = userEvent.setup();
		await renderPage();
		requests[0].error(serverError());

		await user.dblClick(
			await screen.findByRole("button", { name: "Try again" })
		);
		const retryRequests = requests.slice(1);
		retryRequests.at(-1)?.next(response(platinum("p1", "Bloodborne")));
		retryRequests.slice(0, -1).forEach(request => {
			expect(request.observed).toBe(false);
		});

		expect(
			(await screen.findAllByText("Bloodborne")).length
		).toBeGreaterThan(0);
	});

	it("ignores a first response that arrives after the one of a newer search", async () => {
		const user = userEvent.setup();
		await renderPage();
		requests[0].next(response(platinum("p1", "Astro Bot")));
		await screen.findAllByText("Astro Bot");

		await user.type(
			screen.getByRole("textbox", { name: "Filter platinums by title" }),
			"blood"
		);
		await vi.waitFor(() => expect(requests.length).toBeGreaterThan(1));
		const latest = requests.length - 1;
		requests[latest].next(response(platinum("p2", "Bloodborne")));
		requests[latest - 1]?.next(response(platinum("p1", "Astro Bot")));

		expect(
			(await screen.findAllByText("Bloodborne")).length
		).toBeGreaterThan(0);
		expect(screen.queryAllByText("Astro Bot")).toHaveLength(0);
	});

	it("still renders when the browser blocks storage", async () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});

		await renderPage();
		requests[0].next(response(platinum("p1", "Astro Bot")));

		expect(
			(await screen.findAllByText("Astro Bot")).length
		).toBeGreaterThan(0);
	});
});
