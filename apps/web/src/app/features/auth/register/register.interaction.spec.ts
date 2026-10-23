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
import { Register } from "./register";

@Component({
	selector: "app-backlog-landing",
	template: `<h1>My backlog</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class BacklogLanding {}

@Component({
	selector: "app-login-landing",
	template: `<h1>Sign in page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class LoginLanding {}

@Component({
	selector: "app-register-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class RegisterHost {}

const api = environment.apiUrl;

const signedInUser = {
	id: "u1",
	username: "ada_lovelace",
	email: "ada@example.com",
	role: "user",
	theme: null
};

describe("Register interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderRegister() {
		const result = await render(RegisterHost, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ThemeService, useValue: { setLocal: vi.fn() } }
			],
			routes: [
				{ path: "register", component: Register },
				{ path: "login", component: LoginLanding },
				{ path: "backlog", component: BacklogLanding }
			],
			initialRoute: "/register"
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return result;
	}

	async function fillForm(user: ReturnType<typeof userEvent.setup>) {
		await user.type(screen.getByLabelText("Username"), "ada_lovelace");
		await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
		await user.type(screen.getByLabelText("Email"), "ada@example.com");
		await user.type(screen.getByLabelText("Password"), "Passw0rd!");
	}

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("shows a message per field and does not send an empty form", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		expect(
			await screen.findByText("Username is required.")
		).toBeInTheDocument();
		expect(screen.getByText("Name is required.")).toBeInTheDocument();
		expect(screen.getByText("Email is required.")).toBeInTheDocument();
		expect(
			screen.getByText("Meet every requirement below.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/auth/register`);
	});

	it("explains an invalid username, email and name", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await user.type(screen.getByLabelText("Username"), "Ada!");
		await user.type(screen.getByLabelText("Name"), "<Ada>");
		await user.type(screen.getByLabelText("Email"), "not-an-email");
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		expect(
			await screen.findByText(
				"Username must contain only lowercase letters, digits, dots or underscores."
			)
		).toBeInTheDocument();
		expect(
			screen.getByText("Name must not contain < or > characters.")
		).toBeInTheDocument();
		expect(
			screen.getByText("Enter a valid email address.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/auth/register`);
	});

	it("marks the password requirements as met while typing", async () => {
		const user = userEvent.setup();
		await renderRegister();

		const rules = screen.getByRole("list", {
			name: "Password requirements"
		});
		expect(rules).toHaveTextContent("A number (missing)");

		await user.type(screen.getByLabelText("Password"), "abc1");

		expect(rules).toHaveTextContent("A number (done)");
		expect(rules).toHaveTextContent("A lowercase letter (done)");
		expect(rules).toHaveTextContent("An uppercase letter (missing)");
		expect(rules).toHaveTextContent("A symbol, like ! or # (missing)");
		expect(rules).toHaveTextContent("8–15 characters (missing)");
	});

	it.each([
		"short1!",
		"password1!",
		"PASSWORD1!",
		"Password!!",
		"Password11"
	])(
		"rejects the password %s because it breaks the policy",
		async password => {
			const user = userEvent.setup();
			await renderRegister();

			await fillForm(user);
			const field = screen.getByLabelText("Password");
			await user.clear(field);
			await user.type(field, password);
			await user.click(
				screen.getByRole("button", { name: "Create account" })
			);

			expect(
				await screen.findByText("Meet every requirement below.")
			).toBeInTheDocument();
			httpTesting.expectNone(`${api}/auth/register`);
		}
	);

	it("caps username and password at their maximum length while typing", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await user.type(
			screen.getByLabelText("Username"),
			"a_very_long_username"
		);
		await user.type(
			screen.getByLabelText("Password"),
			"Passw0rd!Passw0rd!"
		);

		expect(screen.getByLabelText("Username")).toHaveValue(
			"a_very_long_use"
		);
		expect(screen.getByLabelText("Password")).toHaveValue(
			"Passw0rd!Passw0"
		);
	});

	it("registers the account, loads the user and lands on the backlog", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await fillForm(user);
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		const register = httpTesting.expectOne(`${api}/auth/register`);
		expect(register.request.method).toBe("POST");
		expect(register.request.body).toEqual({
			username: "ada_lovelace",
			email: "ada@example.com",
			name: "Ada Lovelace",
			password: "Passw0rd!"
		});
		register.flush({
			data: { access_token: "access-1", session_id: "session-1" }
		});

		expect(
			await screen.findByRole("button", { name: "Creating account..." })
		).toBeDisabled();

		httpTesting
			.expectOne(`${api}/users/me`)
			.flush({ data: { user: signedInUser } });

		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
		expect(TestBed.inject(Router).url).toBe("/backlog");
		expect(localStorage.getItem("access_token")).not.toBeNull();
	});

	it("still lands on the backlog when loading the user fails", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await fillForm(user);
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		httpTesting.expectOne(`${api}/auth/register`).flush({
			data: { access_token: "access-1", session_id: "session-1" }
		});
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
		expect(TestBed.inject(Router).url).toBe("/backlog");
	});

	it("shows the API error title and lets the user try again", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await fillForm(user);
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		httpTesting
			.expectOne(`${api}/auth/register`)
			.flush(
				{ title: "Username already taken" },
				{ status: 409, statusText: "Conflict" }
			);

		expect(
			await screen.findByText("Username already taken")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create account" })
		).toBeEnabled();

		const username = screen.getByLabelText("Username");
		await user.clear(username);
		await user.type(username, "ada_l2");
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		const retry = httpTesting.expectOne(`${api}/auth/register`);
		expect(retry.request.body).toMatchObject({ username: "ada_l2" });
		retry.flush({
			data: { access_token: "access-2", session_id: "session-2" }
		});
		expect(screen.queryByText("Username already taken")).toBeNull();

		httpTesting
			.expectOne(`${api}/users/me`)
			.flush({ data: { user: signedInUser } });
		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
	});

	it("falls back to a generic message when the error has no title", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await fillForm(user);
		await user.click(
			screen.getByRole("button", { name: "Create account" })
		);

		httpTesting
			.expectOne(`${api}/auth/register`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(
			await screen.findByText("Registration failed")
		).toBeInTheDocument();
	});

	it("links back to sign in", async () => {
		const user = userEvent.setup();
		await renderRegister();

		await user.click(screen.getByRole("link", { name: "Sign in" }));

		expect(
			await screen.findByRole("heading", { name: "Sign in page" })
		).toBeInTheDocument();
		expect(TestBed.inject(Router).url).toBe("/login");
	});
});
