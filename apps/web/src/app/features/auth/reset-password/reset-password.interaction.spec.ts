import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { RouterOutlet } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ThemeService } from "../../../core/services/theme";
import { ResetPassword } from "./reset-password";

@Component({
	selector: "app-login-landing",
	template: `<h1>Sign in page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class LoginLanding {}

@Component({
	selector: "app-forgot-landing",
	template: `<h1>Forgot page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class ForgotLanding {}

@Component({
	selector: "app-reset-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class ResetHost {}

const api = environment.apiUrl;

describe("Reset password interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderResetPassword(
		initialRoute = "/reset-password?token=reset-token"
	) {
		const result = await render(ResetHost, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ThemeService, useValue: { setLocal: vi.fn() } }
			],
			routes: [
				{ path: "reset-password", component: ResetPassword },
				{ path: "login", component: LoginLanding },
				{ path: "forgot-password", component: ForgotLanding }
			],
			initialRoute
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

	async function fillPasswords(
		user: ReturnType<typeof userEvent.setup>,
		newPassword = "Passw0rd!",
		confirmPassword = newPassword
	) {
		await user.type(screen.getByLabelText("New password"), newPassword);
		await user.type(
			screen.getByLabelText("Confirm password"),
			confirmPassword
		);
	}

	afterEach(() => {
		answerShowcase();
		httpTesting.verify();
	});

	it("sends the token from the link with the new password and confirms the change", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		await fillPasswords(user);
		await user.click(
			screen.getByRole("button", { name: "Update password" })
		);

		const request = httpTesting.expectOne(`${api}/auth/reset-password`);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({
			token: "reset-token",
			password: "Passw0rd!"
		});
		expect(
			screen.getByRole("button", { name: "Updating..." })
		).toBeDisabled();
		request.flush(null);

		expect(
			await screen.findByRole("heading", { name: "Password updated" })
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
			"href",
			"/login"
		);
	});

	it("shows the missing requirements and does not send an empty form", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		await user.click(
			screen.getByRole("button", { name: "Update password" })
		);

		expect(
			await screen.findByText("Meet every requirement below.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/auth/reset-password`);
	});

	it("marks the requirements as met while typing", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		const rules = screen.getByRole("list", {
			name: "Password requirements"
		});
		expect(rules).toHaveTextContent("A number (missing)");

		await user.type(screen.getByLabelText("New password"), "abc1");

		expect(rules).toHaveTextContent("A number (done)");
		expect(rules).toHaveTextContent("A lowercase letter (done)");
		expect(rules).toHaveTextContent("An uppercase letter (missing)");
		expect(rules).toHaveTextContent("A symbol, like ! or # (missing)");
		expect(rules).toHaveTextContent("8–15 characters (missing)");
	});

	it("rejects a password that does not meet the policy", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		await fillPasswords(user, "password1");
		await user.click(
			screen.getByRole("button", { name: "Update password" })
		);

		expect(
			await screen.findByText("Meet every requirement below.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/auth/reset-password`);
	});

	it("rejects mismatched confirmation, then submits once they match", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		await fillPasswords(user, "Passw0rd!", "Passw0rd?");
		await user.click(
			screen.getByRole("button", { name: "Update password" })
		);

		expect(
			await screen.findByText("Both passwords must match.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/auth/reset-password`);

		const confirm = screen.getByLabelText("Confirm password");
		await user.clear(confirm);
		await user.type(confirm, "Passw0rd!");
		expect(screen.queryByText("Both passwords must match.")).toBeNull();

		await user.click(
			screen.getByRole("button", { name: "Update password" })
		);
		httpTesting.expectOne(`${api}/auth/reset-password`).flush(null);
		expect(
			await screen.findByRole("heading", { name: "Password updated" })
		).toBeInTheDocument();
	});

	it("reveals both passwords on demand", async () => {
		const user = userEvent.setup();
		await renderResetPassword();

		expect(screen.getByLabelText("New password")).toHaveAttribute(
			"type",
			"password"
		);
		expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
			"type",
			"password"
		);

		await user.click(
			screen.getByRole("button", { name: "Show passwords" })
		);

		expect(screen.getByLabelText("New password")).toHaveAttribute(
			"type",
			"text"
		);
		expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
			"type",
			"text"
		);
		expect(
			screen.getByRole("button", { name: "Hide passwords" })
		).toHaveAttribute("aria-pressed", "true");
	});

	it.each([400, 422])(
		"shows the invalid link page for a %i response and offers a new link",
		async status => {
			const user = userEvent.setup();
			await renderResetPassword();

			await fillPasswords(user);
			await user.click(
				screen.getByRole("button", { name: "Update password" })
			);
			httpTesting
				.expectOne(`${api}/auth/reset-password`)
				.flush(null, { status, statusText: "Error" });

			expect(
				await screen.findByRole("heading", {
					name: "This link no longer works"
				})
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Request a new link" })
			).toHaveAttribute("href", "/forgot-password");
			expect(
				screen.getByRole("link", { name: "Back to sign in" })
			).toHaveAttribute("href", "/login");
		}
	);

	it.each([
		[429, "Too many attempts. Wait a few minutes and try again."],
		[500, "Could not update your password. Please try again."]
	])(
		"keeps the form and shows the message for a %i response",
		async (status, message) => {
			const user = userEvent.setup();
			await renderResetPassword();

			await fillPasswords(user);
			await user.click(
				screen.getByRole("button", { name: "Update password" })
			);
			httpTesting
				.expectOne(`${api}/auth/reset-password`)
				.flush(null, { status, statusText: "Error" });

			expect(await screen.findByRole("alert")).toHaveTextContent(message);
			expect(
				screen.getByRole("button", { name: "Update password" })
			).toBeEnabled();
			expect(screen.getByLabelText("New password")).toHaveValue(
				"Passw0rd!"
			);

			await user.click(
				screen.getByRole("button", { name: "Update password" })
			);
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			httpTesting.expectOne(`${api}/auth/reset-password`).flush(null);
			expect(
				await screen.findByRole("heading", { name: "Password updated" })
			).toBeInTheDocument();
		}
	);

	it.each(["/reset-password", "/reset-password?token="])(
		"shows the invalid link page without the form for %s",
		async route => {
			await renderResetPassword(route);

			expect(
				await screen.findByRole("heading", {
					name: "This link no longer works"
				})
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Request a new link" })
			).toHaveAttribute("href", "/forgot-password");
			expect(
				screen.getByRole("link", { name: "Back to sign in" })
			).toHaveAttribute("href", "/login");
			expect(screen.queryByLabelText("New password")).toBeNull();
			httpTesting.expectNone(`${api}/auth/reset-password`);
		}
	);
});
