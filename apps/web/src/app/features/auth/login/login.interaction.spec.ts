import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, RouterOutlet } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { ThemeService } from "../../../core/services/theme";
import { Login } from "./login";

@Component({
	selector: "app-backlog-landing",
	template: `<h1>My backlog</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class BacklogLanding {}

@Component({
	selector: "app-login-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class LoginHost {}

const api = environment.apiUrl;

const signedInUser = {
	id: "u1",
	username: "ada",
	email: "ada@example.com",
	role: "user",
	theme: null
};

describe("Login interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderLogin(initialRoute = "/login") {
		const result = await render(LoginHost, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ThemeService, useValue: { setLocal: vi.fn() } }
			],
			routes: [
				{ path: "login", component: Login },
				{ path: "backlog", component: BacklogLanding },
				{ path: "queue", component: BacklogLanding }
			],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
		httpTesting
			.match(`${api}/games/showcase`)
			.forEach(req => req.flush({ data: { games: [], featured: null } }));
		return result;
	}

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("shows an error for invalid credentials, then signs in after correcting them", async () => {
		const user = userEvent.setup();
		await renderLogin();

		const signIn = screen.getByRole("button", { name: /sign in/i });
		expect(signIn).toBeDisabled();

		await user.type(screen.getByLabelText("Email"), "ada@example.com");
		await user.type(screen.getByLabelText("Password"), "wrong-pass");
		expect(signIn).toBeEnabled();

		await user.click(signIn);
		const failed = httpTesting.expectOne(`${api}/auth/login`);
		expect(failed.request.method).toBe("POST");
		expect(failed.request.body).toEqual({
			email: "ada@example.com",
			password: "wrong-pass"
		});
		failed.flush(
			{ error: { code: "AUTH_INVALID_CREDENTIALS" } },
			{ status: 401, statusText: "Unauthorized" }
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Invalid email or password."
		);
		expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();

		const password = screen.getByLabelText("Password");
		await user.clear(password);
		await user.type(password, "correct-pass");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		const accepted = httpTesting.expectOne(`${api}/auth/login`);
		expect(accepted.request.body).toEqual({
			email: "ada@example.com",
			password: "correct-pass"
		});
		accepted.flush({
			data: { access_token: "access-1", session_id: "session-1" }
		});

		expect(
			await screen.findByRole("button", { name: /signing in/i })
		).toBeDisabled();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		httpTesting
			.expectOne(`${api}/users/me`)
			.flush({ data: { user: signedInUser } });

		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
		expect(TestBed.inject(Router).url).toBe("/backlog");
		expect(localStorage.getItem("access_token")).not.toBeNull();
	});

	it("shows a generic message when the server fails", async () => {
		const user = userEvent.setup();
		await renderLogin();

		await user.type(screen.getByLabelText("Email"), "ada@example.com");
		await user.type(screen.getByLabelText("Password"), "secret");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		httpTesting
			.expectOne(`${api}/auth/login`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Login failed. Please try again."
		);
	});

	it("returns to the requested page after signing in", async () => {
		const user = userEvent.setup();
		await renderLogin("/login?returnUrl=/queue");

		await user.type(screen.getByLabelText("Email"), "ada@example.com");
		await user.type(screen.getByLabelText("Password"), "secret");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		httpTesting.expectOne(`${api}/auth/login`).flush({
			data: { access_token: "access-1", session_id: "session-1" }
		});
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush({ data: { user: signedInUser } });

		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
		expect(TestBed.inject(Router).url).toBe("/queue");
	});

	it("reveals the password on demand", async () => {
		const user = userEvent.setup();
		await renderLogin();

		const password = screen.getByLabelText("Password");
		expect(password).toHaveAttribute("type", "password");

		await user.click(screen.getByRole("button", { name: "Show password" }));

		expect(password).toHaveAttribute("type", "text");
		expect(
			screen.getByRole("button", { name: "Hide password" })
		).toBeInTheDocument();
	});
});
