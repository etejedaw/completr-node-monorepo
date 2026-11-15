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

import { environment } from "../../../environments/environment";
import { WhatsNewPage } from "./whats-new-page";

const api = environment.apiUrl;

const releases = [
	{
		date: "2026-11-10",
		tag: "v1.2.0",
		title: "Search palette",
		icon: "search",
		tint: "brand",
		highlights: [
			{ icon: "search", tint: "brand", text: "Press / to search" }
		]
	}
];

describe("WhatsNewPage", () => {
	let httpTesting: HttpTestingController;

	async function renderPage() {
		const result = await render(WhatsNewPage, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([])
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerUnrelated();
		return result;
	}

	function answerUnrelated() {
		httpTesting
			.match(req => !req.url.endsWith("/changelog"))
			.forEach(req => req.flush({ data: { backlog: [] } }));
	}

	afterEach(() => {
		answerUnrelated();
		httpTesting.verify();
	});

	it("shows the latest release once the changelog arrives", async () => {
		await renderPage();

		httpTesting.expectOne(`${api}/changelog`).flush({ releases });

		expect(await screen.findByText("Search palette")).toBeInTheDocument();
	});

	it("tells the user the source is unavailable on a 503 problem detail", async () => {
		await renderPage();

		httpTesting
			.expectOne(`${api}/changelog`)
			.flush(
				{ type: "COMMON_SOURCE_UNAVAILABLE", status: 503 },
				{ status: 503, statusText: "Service Unavailable" }
			);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"temporarily unavailable"
		);
	});

	it("shows the connection hint on a network failure and reloads once on a double click", async () => {
		const user = userEvent.setup();
		await renderPage();

		httpTesting
			.expectOne(`${api}/changelog`)
			.error(new ProgressEvent("error"));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Check your connection"
		);

		await user.dblClick(screen.getByRole("button", { name: /try again/i }));
		const retries = httpTesting.match(`${api}/changelog`);
		expect(retries.length).toBeGreaterThanOrEqual(1);
		retries.at(-1)?.flush({ releases });

		expect(await screen.findByText("Search palette")).toBeInTheDocument();
	});

	it("shows no error for an empty changelog", async () => {
		await renderPage();

		httpTesting.expectOne(`${api}/changelog`).flush({ releases: [] });

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
