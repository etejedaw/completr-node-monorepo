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
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { FranchiseDetail } from "./franchise-detail";

@Component({
	selector: "app-franchise-detail-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class FranchiseDetailHost {}

const api = environment.apiUrl;
const detailUrl = `${api}/franchises/metroid`;
const trackUrl = `${detailUrl}/track`;
const NETWORK_ERROR = 0;

describe("Saga detail tracking interaction", () => {
	let httpTesting: HttpTestingController;
	let tracked: boolean;
	let sagaExists: boolean;
	let trackCalls: string[];
	let trackFailures: number[];

	function fail(req: TestRequest, status: number) {
		if (status === NETWORK_ERROR)
			return req.error(new ProgressEvent("error"));
		return req.flush(null, { status, statusText: "Error" });
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method === "GET" && url === detailUrl) {
			if (!sagaExists)
				return req.flush(
					{ type: "FRANCHISE_NOT_FOUND" },
					{ status: 404, statusText: "Not Found" }
				);
			return req.flush({
				data: {
					franchise: {
						id: "f1",
						name: "Metroid",
						code: "metroid",
						description: null
					},
					games: [],
					gameCount: 0,
					isTracked: tracked,
					hasMore: false
				}
			});
		}
		if (url === trackUrl) {
			trackCalls.push(method);
			const failure = trackFailures.shift();
			if (failure !== undefined) return fail(req, failure);
			tracked = method === "POST";
			return req.flush(null, { status: 204, statusText: "No Content" });
		}
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

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function trackButton() {
		return screen.getByRole("button", { name: /^(Track saga|Tracking)$/ });
	}

	async function renderDetail() {
		const { fixture } = await render(FranchiseDetailHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{ path: "franchises/:code", component: FranchiseDetail },
				{ path: "franchises", children: [] },
				{ path: "games", children: [] }
			],
			initialRoute: "/franchises/metroid"
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() => expect(trackButton()).toBeInTheDocument());
	}

	beforeEach(() => {
		tracked = false;
		sagaExists = true;
		trackCalls = [];
		trackFailures = [];
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
	});

	it("sends a single request when the user clicks Track saga several times", async () => {
		const user = userEvent.setup();
		await renderDetail();

		await user.tripleClick(trackButton());

		expect(trackButton()).toBeDisabled();
		await untilVisible(() =>
			expect(trackButton()).toHaveAttribute("aria-pressed", "true")
		);
		expect(trackButton()).toHaveTextContent("Tracking");
		expect(trackCalls).toEqual(["POST"]);
	});

	it("keeps the saga tracked and explains why when stopping fails offline", async () => {
		const user = userEvent.setup();
		tracked = true;
		await renderDetail();
		trackFailures.push(NETWORK_ERROR);

		await user.click(trackButton());

		await untilVisible(() =>
			expect(
				screen.getByText("Couldn't update Metroid. Try again.")
			).toBeInTheDocument()
		);
		expect(trackButton()).toHaveAttribute("aria-pressed", "true");
		expect(trackButton()).toBeEnabled();
	});

	it("shows the saga as gone when it was removed while the page was open", async () => {
		const user = userEvent.setup();
		await renderDetail();
		sagaExists = false;
		trackFailures.push(404);

		await user.click(trackButton());

		await untilVisible(() => {
			expect(
				screen.getByText("Metroid is no longer in the catalog.")
			).toBeInTheDocument();
			expect(screen.getByText("Saga not found")).toBeInTheDocument();
		});
		expect(
			screen.getByRole("link", { name: "Browse sagas" })
		).toHaveAttribute("href", "/franchises");
	});
});
