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
import { AcceptInvite } from "./accept-invite";

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
	selector: "app-invite-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class InviteHost {}

const api = environment.apiUrl;

const invitation = {
	email: "grace@example.com",
	expiresAt: "2026-12-01T00:00:00.000Z"
};

const signedInUser = {
	id: "u2",
	username: "grace_h",
	email: "grace@example.com",
	role: "user",
	theme: null
};

describe("Accept invite interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderAcceptInvite(
		initialRoute = "/accept-invite?token=invite-token"
	) {
		const result = await render(InviteHost, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ThemeService, useValue: { setLocal: vi.fn() } }
			],
			routes: [
				{ path: "accept-invite", component: AcceptInvite },
				{ path: "login", component: LoginLanding },
				{ path: "backlog", component: BacklogLanding }
			],
			initialRoute
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerShowcase();
		return result;
	}

	async function renderReady() {
		const result = await renderAcceptInvite();
		httpTesting
			.expectOne(`${api}/invitations/invite-token`)
			.flush({ data: { invitation } });
		await screen.findByRole("heading", { name: "Create your account" });
		return result;
	}

	function answerShowcase() {
		httpTesting
			.match(`${api}/games/showcase`)
			.filter(req => !req.cancelled)
			.forEach(req => req.flush({ data: { games: [] } }));
	}

	async function fillForm(user: ReturnType<typeof userEvent.setup>) {
		await user.type(screen.getByLabelText("Username"), "grace_h");
		await user.type(screen.getByLabelText("Name"), "Grace Hopper");
		await user.type(screen.getByLabelText("Password"), "Passw0rd!");
		await user.type(screen.getByLabelText("Confirm password"), "Passw0rd!");
	}

	async function submit(user: ReturnType<typeof userEvent.setup>) {
		await user.click(
			screen.getByRole("button", { name: /create account/i })
		);
	}

	afterEach(() => {
		answerShowcase();
		httpTesting.verify();
	});

	it("shows a skeleton while the invitation is checked, then the invited email", async () => {
		await renderAcceptInvite();

		expect(
			screen.getByText("Checking your invitation...")
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();

		const lookup = httpTesting.expectOne(`${api}/invitations/invite-token`);
		expect(lookup.request.method).toBe("GET");
		lookup.flush({ data: { invitation } });

		expect(
			await screen.findByRole("heading", { name: "Create your account" })
		).toBeInTheDocument();
		expect(screen.getByText("grace@example.com")).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
	});

	it("shows the invalid invitation page when the lookup fails", async () => {
		await renderAcceptInvite();

		httpTesting
			.expectOne(`${api}/invitations/invite-token`)
			.flush(null, { status: 404, statusText: "Not Found" });

		expect(
			await screen.findByRole("heading", {
				name: "This invitation no longer works"
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /already have an account/i })
		).toHaveAttribute("href", "/login");
		expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
	});

	it.each(["/accept-invite", "/accept-invite?token="])(
		"shows the invalid invitation page without calling the API for %s",
		async route => {
			await renderAcceptInvite(route);

			expect(
				await screen.findByRole("heading", {
					name: "This invitation no longer works"
				})
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /sign in/i })
			).toHaveAttribute("href", "/login");
			expect(screen.queryByLabelText("Username")).toBeNull();
			httpTesting.expectNone(`${api}/invitations/`);
		}
	);

	it("shows the invalid invitation page for any lookup error", async () => {
		await renderAcceptInvite();

		httpTesting
			.expectOne(`${api}/invitations/invite-token`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(
			await screen.findByRole("heading", {
				name: "This invitation no longer works"
			})
		).toBeInTheDocument();
	});

	it("validates every field and does not send an incomplete form", async () => {
		const user = userEvent.setup();
		await renderReady();

		await submit(user);

		expect(
			await screen.findByText("Username is required.")
		).toBeInTheDocument();
		expect(screen.getByText("Name is required.")).toBeInTheDocument();
		expect(
			screen.getByText("Meet every requirement below.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/invitations/accept`);
	});

	it("explains username and name format problems", async () => {
		const user = userEvent.setup();
		await renderReady();

		const username = screen.getByLabelText("Username");
		await user.type(username, "ab");
		await user.tab();
		expect(
			await screen.findByText(
				"Username must be between 4 and 15 characters."
			)
		).toBeInTheDocument();

		await user.clear(username);
		await user.type(username, "Grace H");
		expect(
			await screen.findByText(
				"Username must contain only lowercase letters, digits, dots or underscores."
			)
		).toBeInTheDocument();

		const name = screen.getByLabelText("Name");
		await user.type(name, "<b>x</b>");
		await user.tab();
		expect(
			await screen.findByText("Name must not contain < or > characters.")
		).toBeInTheDocument();

		await user.clear(name);
		await user.type(name, "Gr");
		await user.tab();
		expect(
			await screen.findByText("Name must be between 4 and 80 characters.")
		).toBeInTheDocument();
	});

	it("rejects mismatched passwords", async () => {
		const user = userEvent.setup();
		await renderReady();

		await user.type(screen.getByLabelText("Username"), "grace_h");
		await user.type(screen.getByLabelText("Name"), "Grace Hopper");
		await user.type(screen.getByLabelText("Password"), "Passw0rd!");
		await user.type(screen.getByLabelText("Confirm password"), "Passw0rd?");
		await submit(user);

		expect(
			await screen.findByText("Both passwords must match.")
		).toBeInTheDocument();
		httpTesting.expectNone(`${api}/invitations/accept`);
	});

	it("reveals both passwords on demand", async () => {
		const user = userEvent.setup();
		await renderReady();

		await user.click(
			screen.getByRole("button", { name: "Show passwords" })
		);

		expect(screen.getByLabelText("Password")).toHaveAttribute(
			"type",
			"text"
		);
		expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
			"type",
			"text"
		);
	});

	it("creates the account, loads the user and lands on the backlog", async () => {
		const user = userEvent.setup();
		await renderReady();

		await fillForm(user);
		await submit(user);

		const accept = httpTesting.expectOne(`${api}/invitations/accept`);
		expect(accept.request.method).toBe("POST");
		expect(accept.request.body).toEqual({
			token: "invite-token",
			username: "grace_h",
			name: "Grace Hopper",
			password: "Passw0rd!"
		});
		accept.flush({
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
		await renderReady();

		await fillForm(user);
		await submit(user);
		httpTesting.expectOne(`${api}/invitations/accept`).flush({
			data: { access_token: "access-1", session_id: "session-1" }
		});
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
	});

	it.each([
		[409, "That username is already taken. Try another one."],
		[429, "Too many attempts. Wait a minute and try again."],
		[
			422,
			"Some fields don't meet the requirements. Check them and try again."
		],
		[500, "Could not create your account. Please try again."]
	])(
		"keeps the form and shows the message for a %i response",
		async (status, message) => {
			const user = userEvent.setup();
			await renderReady();

			await fillForm(user);
			await submit(user);
			httpTesting
				.expectOne(`${api}/invitations/accept`)
				.flush(null, { status, statusText: "Error" });

			expect(await screen.findByRole("alert")).toHaveTextContent(message);
			expect(
				screen.getByRole("button", { name: /create account/i })
			).toBeEnabled();
			expect(screen.getByLabelText("Username")).toHaveValue("grace_h");
		}
	);

	it("lets the user pick another username after a conflict", async () => {
		const user = userEvent.setup();
		await renderReady();

		await fillForm(user);
		await submit(user);
		httpTesting
			.expectOne(`${api}/invitations/accept`)
			.flush(null, { status: 409, statusText: "Conflict" });
		await screen.findByRole("alert");

		const username = screen.getByLabelText("Username");
		await user.clear(username);
		await user.type(username, "grace_h2");
		await submit(user);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		const retry = httpTesting.expectOne(`${api}/invitations/accept`);
		expect(retry.request.body).toMatchObject({ username: "grace_h2" });
		retry.flush({
			data: { access_token: "access-2", session_id: "session-2" }
		});
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush({ data: { user: signedInUser } });
		expect(
			await screen.findByRole("heading", { name: "My backlog" })
		).toBeInTheDocument();
	});

	it("switches to the invalid invitation page when accepting returns 404", async () => {
		const user = userEvent.setup();
		await renderReady();

		await fillForm(user);
		await submit(user);
		httpTesting
			.expectOne(`${api}/invitations/accept`)
			.flush(null, { status: 404, statusText: "Not Found" });

		expect(
			await screen.findByRole("heading", {
				name: "This invitation no longer works"
			})
		).toBeInTheDocument();
	});
});
