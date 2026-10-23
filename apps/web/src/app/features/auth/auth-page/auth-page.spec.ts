import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { environment } from "../../../../environments/environment";
import { AuthPage } from "./auth-page";

const api = environment.apiUrl;

describe("AuthPage", () => {
	let httpTesting: HttpTestingController;

	async function renderPage() {
		const result = await render(
			`<app-auth-page eyebrow="Password recovery" heading="Forgot your password?" subtitle="We will email you a link.">
				<p>Projected form</p>
			</app-auth-page>`,
			{
				imports: [AuthPage],
				providers: [
					provideHttpClient(),
					provideHttpClientTesting(),
					provideRouter([])
				]
			}
		);
		httpTesting = TestBed.inject(HttpTestingController);
		return result;
	}

	afterEach(() => {
		httpTesting
			.match(`${api}/games/showcase`)
			.forEach(req => req.flush({ data: { games: [] } }));
		httpTesting.verify();
	});

	it("renders the eyebrow, heading and subtitle", async () => {
		await renderPage();

		expect(screen.getByText("Password recovery")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Forgot your password?"
			})
		).toBeInTheDocument();
		expect(
			screen.getByText("We will email you a link.")
		).toBeInTheDocument();
	});

	it("projects its content inside the main region", async () => {
		await renderPage();

		expect(screen.getByRole("main")).toContainElement(
			screen.getByText("Projected form")
		);
	});

	it("links to the privacy policy and credits the author", async () => {
		await renderPage();

		expect(
			screen.getByRole("link", { name: "Privacy Policy" })
		).toHaveAttribute("href", "/privacy");
		const author = screen.getByRole("link", { name: "Esteban Tejeda" });
		expect(author).toHaveAttribute("href", "https://www.etejeda.dev");
		expect(author).toHaveAttribute("target", "_blank");
		expect(author).toHaveAttribute("rel", "noopener noreferrer");
		expect(screen.getByText(/Made with ♥ by/)).toBeInTheDocument();
	});

	it("shows the showcase next to the form", async () => {
		await renderPage();

		httpTesting.expectOne(`${api}/games/showcase`);
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			/Play what's\s*worth your time\./
		);
	});
});
