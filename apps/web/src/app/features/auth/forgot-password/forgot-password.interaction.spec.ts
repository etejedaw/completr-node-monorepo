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
import { ThemeService } from "../../../core/services/theme";
import { ForgotPassword } from "./forgot-password";

const api = environment.apiUrl;

describe("Forgot password interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderForgotPassword() {
		const result = await render(ForgotPassword, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: ThemeService, useValue: { setLocal: vi.fn() } }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerShowcase();
		return result;
	}

	function answerShowcase() {
		httpTesting
			.match(`${api}/games/showcase`)
			.filter(req => !req.cancelled)
			.forEach(req => req.flush({ data: { games: [] } }));
	}

	async function requestLink(
		user: ReturnType<typeof userEvent.setup>,
		address = "ada@example.com"
	) {
		await user.type(screen.getByLabelText("Email"), address);
		await user.click(
			screen.getByRole("button", { name: "Send reset link" })
		);
	}

	afterEach(() => {
		answerShowcase();
		httpTesting.verify();
	});

	it("keeps the button disabled until the email is valid", async () => {
		const user = userEvent.setup();
		await renderForgotPassword();

		const send = screen.getByRole("button", { name: "Send reset link" });
		expect(send).toBeDisabled();

		await user.type(screen.getByLabelText("Email"), "not-an-email");
		expect(send).toBeDisabled();

		await user.clear(screen.getByLabelText("Email"));
		await user.type(screen.getByLabelText("Email"), "ada@example.com");
		expect(send).toBeEnabled();
	});

	it("sends the reset link and confirms the address", async () => {
		const user = userEvent.setup();
		await renderForgotPassword();

		await requestLink(user);

		const request = httpTesting.expectOne(`${api}/auth/forgot-password`);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({ email: "ada@example.com" });
		expect(
			screen.getByRole("button", { name: "Sending link..." })
		).toBeDisabled();
		request.flush(null);

		expect(
			await screen.findByRole("heading", { name: "Reset link sent" })
		).toBeInTheDocument();
		expect(screen.getByText("ada@example.com")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /back to sign in/i })
		).toHaveAttribute("href", "/login");
	});

	it("goes back to an empty form to try another email", async () => {
		const user = userEvent.setup();
		await renderForgotPassword();

		await requestLink(user);
		httpTesting.expectOne(`${api}/auth/forgot-password`).flush(null);

		await user.click(
			await screen.findByRole("button", { name: "try another email" })
		);

		expect(
			await screen.findByRole("heading", {
				name: "Forgot your password?"
			})
		).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toHaveValue("");
		expect(
			screen.getByRole("button", { name: "Send reset link" })
		).toBeDisabled();

		await requestLink(user, "grace@example.com");
		const second = httpTesting.expectOne(`${api}/auth/forgot-password`);
		expect(second.request.body).toEqual({ email: "grace@example.com" });
		second.flush(null);
		expect(
			await screen.findByText("grace@example.com")
		).toBeInTheDocument();
	});

	it.each([
		[429, "Too many requests. Wait a few minutes and try again."],
		[503, "Password recovery is not available right now. Try again later."],
		[500, "Could not send the reset link. Please try again."]
	])("shows the message for a %i response", async (status, message) => {
		const user = userEvent.setup();
		await renderForgotPassword();

		await requestLink(user);
		httpTesting
			.expectOne(`${api}/auth/forgot-password`)
			.flush(null, { status, statusText: "Error" });

		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		expect(
			screen.getByRole("button", { name: "Send reset link" })
		).toBeEnabled();
		expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
	});

	it("clears the error when the user submits again", async () => {
		const user = userEvent.setup();
		await renderForgotPassword();

		await requestLink(user);
		httpTesting
			.expectOne(`${api}/auth/forgot-password`)
			.flush(null, { status: 429, statusText: "Too Many Requests" });
		expect(await screen.findByRole("alert")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Send reset link" })
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		httpTesting.expectOne(`${api}/auth/forgot-password`).flush(null);

		expect(
			await screen.findByRole("heading", { name: "Reset link sent" })
		).toBeInTheDocument();
	});
});
