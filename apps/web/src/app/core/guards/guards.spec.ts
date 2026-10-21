import { DOCUMENT } from "@angular/common";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
	type ActivatedRouteSnapshot,
	type CanActivateFn,
	convertToParamMap,
	Router,
	type RouterStateSnapshot,
	UrlTree
} from "@angular/router";
import { isObservable, lastValueFrom, type Observable, of } from "rxjs";

import { BETA_SIGNUP_URL } from "../../shared/constants/beta-signup";
import { type User } from "../models";
import { AuthService } from "../services/auth";
import { adminGuard } from "./admin.guard";
import { authGuard } from "./auth.guard";
import { betaSignupRedirectGuard } from "./beta-signup-redirect.guard";
import { guestGuard } from "./guest.guard";
import { guestMatch } from "./guest.match";
import { moderatorGuard } from "./moderator.guard";
import { selfProfileRedirect } from "./self-profile-redirect.guard";
import { tokenQueryGuard } from "./token-query.guard";

type GuardResult = boolean | UrlTree;

describe("route guards", () => {
	const user = signal<Partial<User> | null>(null);
	let token: string | null;
	let loadedUser: Partial<User> | null;
	const loadUser = vi.fn();

	beforeEach(() => {
		user.set(null);
		token = null;
		loadedUser = null;
		loadUser.mockReset().mockImplementation(() => {
			user.set(loadedUser);
			return of({ data: { user: loadedUser } });
		});
		TestBed.configureTestingModule({
			providers: [
				{
					provide: AuthService,
					useValue: { token: () => token, user, loadUser }
				}
			]
		});
	});

	async function run(
		guard: CanActivateFn,
		route: Partial<ActivatedRouteSnapshot> = {},
		state: Partial<RouterStateSnapshot> = {}
	): Promise<GuardResult> {
		const result = TestBed.runInInjectionContext(() =>
			guard(route as ActivatedRouteSnapshot, state as RouterStateSnapshot)
		);
		return isObservable(result)
			? lastValueFrom(result as Observable<GuardResult>)
			: (result as GuardResult);
	}

	function urlOf(result: GuardResult) {
		expect(result).toBeInstanceOf(UrlTree);
		return TestBed.inject(Router).serializeUrl(result as UrlTree);
	}

	describe("authGuard", () => {
		it("allows navigation when there is a token", async () => {
			token = "t";

			expect(await run(authGuard)).toBe(true);
		});

		it("redirects to login keeping the requested url as returnUrl", async () => {
			const result = await run(authGuard, {}, { url: "/backlog?x=1" });

			expect(urlOf(result)).toBe("/login?returnUrl=%2Fbacklog%3Fx%3D1");
		});
	});

	describe("guestGuard", () => {
		it("allows anonymous visitors", async () => {
			expect(await run(guestGuard)).toBe(true);
		});

		it("sends logged-in users to the backlog", async () => {
			token = "t";

			expect(urlOf(await run(guestGuard))).toBe("/backlog");
		});
	});

	describe("guestMatch", () => {
		it("matches only when there is no token", () => {
			expect(
				TestBed.runInInjectionContext(() =>
					guestMatch({} as never, [], {} as never)
				)
			).toBe(true);

			token = "t";

			expect(
				TestBed.runInInjectionContext(() =>
					guestMatch({} as never, [], {} as never)
				)
			).toBe(false);
		});
	});

	describe("adminGuard", () => {
		it("allows a loaded admin without fetching the user", async () => {
			user.set({ role: "admin" });

			expect(await run(adminGuard)).toBe(true);
			expect(loadUser).not.toHaveBeenCalled();
		});

		it("redirects a loaded non-admin to 403", async () => {
			user.set({ role: "moderator" });

			expect(urlOf(await run(adminGuard))).toBe("/403");
		});

		it("redirects to 403 without a token or loaded user", async () => {
			expect(urlOf(await run(adminGuard))).toBe("/403");
			expect(loadUser).not.toHaveBeenCalled();
		});

		it("loads the user when only a token exists and allows an admin", async () => {
			token = "t";
			loadedUser = { role: "admin" };

			expect(await run(adminGuard)).toBe(true);
			expect(loadUser).toHaveBeenCalledTimes(1);
		});

		it("loads the user when only a token exists and denies a regular user", async () => {
			token = "t";
			loadedUser = { role: "user" };

			expect(urlOf(await run(adminGuard))).toBe("/403");
		});
	});

	describe("moderatorGuard", () => {
		it.each(["moderator", "admin"])("allows a loaded %s", async role => {
			user.set({ role } as Partial<User>);

			expect(await run(moderatorGuard)).toBe(true);
		});

		it("redirects a loaded regular user to 403", async () => {
			user.set({ role: "user" });

			expect(urlOf(await run(moderatorGuard))).toBe("/403");
		});

		it("redirects to 403 without a token or loaded user", async () => {
			expect(urlOf(await run(moderatorGuard))).toBe("/403");
		});

		it("loads the user when only a token exists", async () => {
			token = "t";
			loadedUser = { role: "moderator" };

			expect(await run(moderatorGuard)).toBe(true);
			expect(loadUser).toHaveBeenCalledTimes(1);
		});

		it("denies after loading a regular user", async () => {
			token = "t";
			loadedUser = { role: "user" };

			expect(urlOf(await run(moderatorGuard))).toBe("/403");
		});
	});

	describe("selfProfileRedirect", () => {
		it("redirects to the loaded username without fetching", async () => {
			user.set({ username: "ada" });

			expect(urlOf(await run(selfProfileRedirect))).toBe("/user/ada");
			expect(loadUser).not.toHaveBeenCalled();
		});

		it("fetches the user and redirects to their profile", async () => {
			loadedUser = { username: "grace" };

			expect(urlOf(await run(selfProfileRedirect))).toBe("/user/grace");
			expect(loadUser).toHaveBeenCalledTimes(1);
		});
	});

	describe("tokenQueryGuard", () => {
		function routeWith(query: Record<string, string>) {
			return { queryParamMap: convertToParamMap(query) };
		}

		it("allows navigation when the token query param is present", async () => {
			expect(
				await run(tokenQueryGuard, routeWith({ token: "abc" }))
			).toBe(true);
		});

		it("redirects to login when the token is missing or empty", async () => {
			expect(urlOf(await run(tokenQueryGuard, routeWith({})))).toBe(
				"/login"
			);
			expect(
				urlOf(await run(tokenQueryGuard, routeWith({ token: "" })))
			).toBe("/login");
		});
	});

	describe("betaSignupRedirectGuard", () => {
		it("redirects logged-in users to the backlog", async () => {
			token = "t";

			expect(urlOf(await run(betaSignupRedirectGuard))).toBe("/backlog");
		});

		it("sends anonymous visitors to the beta signup page and blocks the route", async () => {
			const assign = vi.fn();
			TestBed.overrideProvider(DOCUMENT, {
				useValue: { defaultView: { location: { assign } } }
			});

			expect(await run(betaSignupRedirectGuard)).toBe(false);
			expect(assign).toHaveBeenCalledWith(BETA_SIGNUP_URL);
		});
	});
});
