import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastService } from "../../../core/services/toast";
import { AdminReports } from "./admin-reports";

const REPORTS_URL = `${environment.apiUrl}/admin/game-reports`;
const toast = { success: vi.fn(), warning: vi.fn() };

function report(id: string, category: string) {
	return {
		id,
		gameId: `g-${id}`,
		userId: `u-${id}`,
		message: `Message ${id}`,
		category,
		status: "pending",
		createdAt: "2026-03-01T10:00:00.000Z",
		updatedAt: "2026-03-01T10:00:00.000Z",
		Game: { id: `g-${id}`, title: `Game ${id}`, code: `game-${id}` },
		User: { id: `u-${id}`, username: `reporter-${id}` }
	};
}

describe("Admin reports errors", () => {
	let http: HttpTestingController;

	beforeEach(() => {
		toast.success.mockReset();
		toast.warning.mockReset();
	});

	afterEach(() => {
		http.match(() => true);
		http.verify();
	});

	async function renderLoaded() {
		await render(AdminReports, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: ToastService, useValue: toast },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: convertToParamMap({}) }
					}
				}
			]
		});
		http = TestBed.inject(HttpTestingController);
		http.expectOne(REPORTS_URL).flush({
			data: {
				reports: [
					report("r1", "missing_score"),
					report("r2", "missing_duration"),
					report("r3", "general")
				]
			}
		});
	}

	it("labels every report with its category", async () => {
		await renderLoaded();

		expect(await screen.findByText("Missing score")).toBeInTheDocument();
		expect(screen.getByText("Missing duration")).toBeInTheDocument();
		expect(screen.getByText("General")).toBeInTheDocument();
	});

	it("drops a report that no longer exists when resolving it answers 404", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const first = (await screen.findAllByRole("listitem"))[0]!;
		await user.click(
			within(first).getByRole("button", { name: /Approve/ })
		);
		http.expectOne(`${REPORTS_URL}/r1`).flush(
			{ type: "GAME_REPORT_NOT_FOUND", title: "Not found" },
			{ status: 404, statusText: "Not Found" }
		);

		await waitFor(() =>
			expect(screen.getAllByRole("listitem")).toHaveLength(2)
		);
		expect(toast.warning).toHaveBeenCalledWith(
			"That report was already resolved."
		);
	});

	it("sends one request when Approve is clicked repeatedly", async () => {
		const user = userEvent.setup();
		await renderLoaded();

		const first = (await screen.findAllByRole("listitem"))[0]!;
		const approve = within(first).getByRole("button", { name: /Approve/ });
		await user.tripleClick(approve);

		expect(http.match(`${REPORTS_URL}/r1`)).toHaveLength(1);
	});
});
