import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { AboutPage } from "./about-page";

describe("AboutPage", () => {
	it("renders the page with a heading, feedback mail link and no premium mention", async () => {
		await render(AboutPage, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([])
			]
		});
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(request => request.flush({ data: { backlog: [] } }));

		expect(
			screen.getAllByRole("heading", { level: 2 }).length
		).toBeGreaterThan(0);
		expect(
			screen
				.getAllByRole("link")
				.some(link => link.getAttribute("href")?.startsWith("mailto:"))
		).toBe(true);
		expect(document.body.textContent).not.toMatch(/premium/i);
	});
});
