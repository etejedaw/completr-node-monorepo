import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";

import { environment } from "../../../environments/environment";
import { type User } from "../models";
import { AuthService } from "./auth";
import { ThemeService } from "./theme";

function jwtExpiringIn(seconds: number): string {
	const payload = btoa(
		JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })
	)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `header.${payload}.signature`;
}

const authResponse = {
	data: { access_token: "access-1", session_id: "session-1" }
};

describe("AuthService", () => {
	const api = environment.apiUrl;
	let service: AuthService;
	let httpTesting: HttpTestingController;
	const navigate = vi.fn();
	const setLocal = vi.fn();

	beforeEach(() => {
		localStorage.clear();
		navigate.mockReset();
		setLocal.mockReset();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: Router, useValue: { navigate } },
				{ provide: ThemeService, useValue: { setLocal } }
			]
		});
		service = TestBed.inject(AuthService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	describe("session tokens", () => {
		it("starts anonymous with no token or session", () => {
			expect(service.token()).toBeNull();
			expect(service.sessionId()).toBeNull();
			expect(service.isLoggedIn()).toBe(false);
			expect(service.isPremium()).toBe(false);
		});

		it("stores the tokens returned by login and sends credentials", () => {
			service.login({ email: "a@b.c", password: "secret" }).subscribe();

			const req = httpTesting.expectOne(`${api}/auth/login`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({
				email: "a@b.c",
				password: "secret"
			});
			expect(req.request.withCredentials).toBe(true);
			req.flush(authResponse);
			expect(service.token()).toBe("access-1");
			expect(service.sessionId()).toBe("session-1");
		});

		it("stores the tokens returned by register", () => {
			const body = {
				username: "ada",
				email: "a@b.c",
				password: "secret",
				name: "Ada"
			};

			service.register(body).subscribe();

			const req = httpTesting.expectOne(`${api}/auth/register`);
			expect(req.request.body).toEqual(body);
			req.flush(authResponse);
			expect(service.token()).toBe("access-1");
		});

		it("stores the tokens returned by accepting an invitation", () => {
			const body = {
				token: "inv",
				username: "ada",
				name: "Ada",
				password: "secret"
			};

			service.acceptInvitation(body).subscribe();

			const req = httpTesting.expectOne(`${api}/invitations/accept`);
			expect(req.request.body).toEqual(body);
			expect(req.request.withCredentials).toBe(true);
			req.flush(authResponse);
			expect(service.sessionId()).toBe("session-1");
		});

		it("renews the stored tokens on refresh", () => {
			localStorage.setItem("access_token", "stale");

			service.refresh().subscribe();

			const req = httpTesting.expectOne(`${api}/auth/refresh`);
			expect(req.request.method).toBe("POST");
			expect(req.request.withCredentials).toBe(true);
			req.flush(authResponse);
			expect(service.token()).toBe("access-1");
		});

		it("keeps the old tokens when login fails", () => {
			localStorage.setItem("access_token", "old");

			service
				.login({ email: "a@b.c", password: "bad" })
				.subscribe({ error: () => undefined });
			httpTesting
				.expectOne(`${api}/auth/login`)
				.flush(null, { status: 401, statusText: "Unauthorized" });

			expect(service.token()).toBe("old");
		});

		it("reports logged in when a token is stored even without a loaded user", () => {
			localStorage.setItem("access_token", "t");

			expect(service.isLoggedIn()).toBe(true);
		});
	});

	describe("isAccessTokenExpired", () => {
		it("is false without a token", () => {
			expect(service.isAccessTokenExpired()).toBe(false);
		});

		it("is false for a token that expires well in the future", () => {
			localStorage.setItem("access_token", jwtExpiringIn(600));

			expect(service.isAccessTokenExpired()).toBe(false);
		});

		it("is true for a token already expired", () => {
			localStorage.setItem("access_token", jwtExpiringIn(-10));

			expect(service.isAccessTokenExpired()).toBe(true);
		});

		it("is true inside the default 30 second skew", () => {
			localStorage.setItem("access_token", jwtExpiringIn(10));

			expect(service.isAccessTokenExpired()).toBe(true);
			expect(service.isAccessTokenExpired(0)).toBe(false);
		});

		it.each(["opaque", "a.!!!.c", `a.${btoa('{"no":"exp"}')}.c`])(
			"is false when the token %s cannot be decoded to an exp claim",
			token => {
				localStorage.setItem("access_token", token);

				expect(service.isAccessTokenExpired()).toBe(false);
			}
		);
	});

	describe("loadUser", () => {
		const user = { id: "u1", username: "ada", role: "premium" } as User;

		it("loads the current user and exposes premium status", () => {
			service.loadUser().subscribe();

			const req = httpTesting.expectOne(`${api}/users/me`);
			expect(req.request.method).toBe("GET");
			req.flush({ data: { user } });
			expect(service.user()).toEqual(user);
			expect(service.isLoggedIn()).toBe(true);
			expect(service.isPremium()).toBe(true);
			expect(setLocal).not.toHaveBeenCalled();
		});

		it("applies the theme saved in the user profile", () => {
			service.loadUser().subscribe();

			httpTesting
				.expectOne(`${api}/users/me`)
				.flush({ data: { user: { ...user, theme: "midnight-cyan" } } });

			expect(setLocal).toHaveBeenCalledWith("midnight-cyan");
		});
	});

	describe("logout and clearSession", () => {
		beforeEach(() => {
			localStorage.setItem("access_token", "t");
			localStorage.setItem("session_id", "s");
		});

		it("clears storage and user and navigates to login", () => {
			service.clearSession();

			expect(service.token()).toBeNull();
			expect(service.sessionId()).toBeNull();
			expect(service.user()).toBeNull();
			expect(navigate).toHaveBeenCalledWith(["/login"]);
		});

		it("notifies the server and clears the local session on logout", () => {
			service.logout();

			const req = httpTesting.expectOne(`${api}/auth/logout`);
			expect(req.request.method).toBe("POST");
			expect(req.request.withCredentials).toBe(true);
			expect(service.token()).toBeNull();
			expect(navigate).toHaveBeenCalledWith(["/login"]);
			req.flush(null);
		});
	});

	describe("password and invitations", () => {
		it("requests a password reset email", () => {
			service.requestPasswordReset("a@b.c").subscribe();

			const req = httpTesting.expectOne(`${api}/auth/forgot-password`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({ email: "a@b.c" });
			req.flush(null);
		});

		it("resets the password with the emailed token", () => {
			service.resetPassword("tok", "new-pass").subscribe();

			const req = httpTesting.expectOne(`${api}/auth/reset-password`);
			expect(req.request.body).toEqual({
				token: "tok",
				password: "new-pass"
			});
			req.flush(null);
		});

		it("fetches a pending invitation and unwraps it", () => {
			const invitation = { email: "a@b.c", expiresAt: "2026-12-01" };
			let result: unknown;

			service.getInvitation("tok").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${api}/invitations/tok`)
				.flush({ data: { invitation } });
			expect(result).toEqual(invitation);
		});
	});

	describe("sessions", () => {
		it("lists sessions with pagination and unwraps the data", () => {
			const data = { sessions: [{ id: "s1" }], total: 1 };
			let result: unknown;

			service
				.getSessions({ limit: 10, offset: 20 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${api}/auth/sessions`
			);
			expect(req.request.params.get("limit")).toBe("10");
			expect(req.request.params.get("offset")).toBe("20");
			req.flush({ data });
			expect(result).toEqual(data);
		});

		it("lists sessions without params by default", () => {
			service.getSessions().subscribe();

			const req = httpTesting.expectOne(
				r => r.url === `${api}/auth/sessions`
			);
			expect(req.request.params.keys()).toEqual([]);
			req.flush({ data: { sessions: [], total: 0 } });
		});

		it("revokes one session expecting a text response", () => {
			service.revokeSession("s1").subscribe();

			const req = httpTesting.expectOne(`${api}/auth/sessions/s1`);
			expect(req.request.method).toBe("DELETE");
			expect(req.request.responseType).toBe("text");
			req.flush("");
		});

		it("revokes the other sessions and returns how many were revoked", () => {
			let revoked: number | undefined;

			service.revokeOtherSessions("s1").subscribe(n => (revoked = n));

			const req = httpTesting.expectOne(`${api}/auth/sessions/others/s1`);
			expect(req.request.method).toBe("DELETE");
			req.flush({ data: { revoked: 3 } });
			expect(revoked).toBe(3);
		});
	});
});
