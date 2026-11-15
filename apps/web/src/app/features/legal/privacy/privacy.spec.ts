import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { Privacy } from "./privacy";

const api = environment.apiUrl;

const policy = {
	lang: "en",
	version: "1.0",
	updated: "2026-11-01",
	title: "Privacy Policy",
	summary: "What we store.",
	highlights: [],
	sections: [
		{
			id: "who",
			label: "Who runs Completr",
			icon: "person",
			title: "Who runs Completr",
			html: "<p>One person.</p>"
		}
	]
};

describe("Privacy", () => {
	let httpTesting: HttpTestingController;

	beforeAll(() => {
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		vi.stubGlobal("matchMedia", () => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	async function renderPage() {
		const result = await render(Privacy, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([])
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return result;
	}

	afterEach(() => {
		httpTesting.verify();
	});

	it("renders the sections of the policy", async () => {
		await renderPage();

		httpTesting.expectOne(`${api}/privacy`).flush(policy);

		expect(
			(await screen.findAllByText("Who runs Completr")).length
		).toBeGreaterThan(0);
		expect(await screen.findByText("One person.")).toBeInTheDocument();
	});

	it("explains that the source is unavailable on a 503 problem detail", async () => {
		await renderPage();

		httpTesting
			.expectOne(`${api}/privacy`)
			.flush(
				{ type: "COMMON_SOURCE_UNAVAILABLE", status: 503 },
				{ status: 503, statusText: "Service Unavailable" }
			);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"temporarily unavailable"
		);
	});

	it("recovers after a network failure and a double click on try again", async () => {
		const user = userEvent.setup();
		await renderPage();

		httpTesting
			.expectOne(`${api}/privacy`)
			.error(new ProgressEvent("error"));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"out of reach"
		);

		await user.dblClick(screen.getByRole("button", { name: /try again/i }));
		const retries = httpTesting.match(`${api}/privacy`);
		expect(retries.length).toBeGreaterThanOrEqual(1);
		retries.at(-1)?.flush(policy);

		expect(await screen.findByText("One person.")).toBeInTheDocument();
	});
});
