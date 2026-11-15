import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { fireEvent, render, screen } from "@testing-library/angular";
import { defer, Subject, throwError } from "rxjs";

import { AuthService } from "../core/services/auth";
import { OnboardingService } from "../core/services/onboarding";
import { ToastService } from "../core/services/toast";
import { Layout } from "./layout";

@Component({
	selector: "app-page-stub",
	template: `<h1>Page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class PageStub {}

describe("Layout", () => {
	const user = signal<{ username: string; role: string } | null>(null);
	let loadUser$: Subject<unknown>;
	const loadUser = vi.fn();
	const logout = vi.fn();
	const warning = vi.spyOn(ToastService.prototype, "warning");
	const maybeStartOnboarding = vi.spyOn(
		OnboardingService.prototype,
		"maybeStartForFirstTime"
	);

	async function renderLayout() {
		return render(Layout, {
			providers: [
				provideRouter([
					{ path: "feed", component: PageStub },
					{ path: "games", component: PageStub }
				]),
				{
					provide: AuthService,
					useValue: {
						user,
						isPremium: signal(false),
						loadUser,
						logout
					}
				}
			]
		});
	}

	function failLoadWith(status: number) {
		loadUser$.error(new HttpErrorResponse({ status }));
	}

	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ["setTimeout", "setInterval", "clearInterval"]
		});
		localStorage.clear();
		user.set(null);
		loadUser$ = new Subject();
		loadUser.mockReset().mockImplementation(() => loadUser$);
		logout.mockReset();
		warning.mockReset().mockImplementation(() => undefined);
		maybeStartOnboarding.mockReset().mockImplementation(() => undefined);
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("starts the onboarding once the user loads", async () => {
		await renderLayout();

		user.set({ username: "ada", role: "user" });
		loadUser$.next({});
		loadUser$.complete();

		expect(maybeStartOnboarding).toHaveBeenCalledTimes(1);
		expect(warning).not.toHaveBeenCalled();
	});

	it("does not fetch the user again when it is already loaded", async () => {
		user.set({ username: "ada", role: "user" });
		await renderLayout();

		expect(loadUser).not.toHaveBeenCalled();
		expect(maybeStartOnboarding).toHaveBeenCalledTimes(1);
	});

	it("retries server errors twice and then warns the user", async () => {
		let attempts = 0;
		loadUser.mockImplementation(() =>
			defer(() => {
				attempts += 1;
				return throwError(
					() => new HttpErrorResponse({ status: 500 + attempts })
				);
			})
		);
		await renderLayout();
		expect(attempts).toBe(1);

		await vi.advanceTimersByTimeAsync(1500);
		expect(attempts).toBe(2);
		expect(warning).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1500);
		expect(attempts).toBe(3);
		expect(warning).toHaveBeenCalledTimes(1);
	});

	it("does not retry a client error and warns right away", async () => {
		await renderLayout();

		failLoadWith(404);

		expect(loadUser).toHaveBeenCalledTimes(1);
		expect(warning).toHaveBeenCalledWith(
			expect.stringContaining("couldn't load your account")
		);
	});

	it("stops reacting to navigation once destroyed", async () => {
		const { fixture } = await renderLayout();
		const router = TestBed.inject(Router);

		fixture.destroy();
		await router.navigateByUrl("/games");

		expect(() => fixture.destroy()).not.toThrow();
	});

	it("opens the search with the slash key outside text fields and ignores it while typing", async () => {
		await renderLayout();

		const field = document.createElement("input");
		document.body.appendChild(field);
		fireEvent.keyDown(field, { key: "/" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		field.remove();

		fireEvent.keyDown(document.body, { key: "/" });
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
	});

	it("remembers the collapsed sidebar", async () => {
		localStorage.setItem("completr.sidebar.collapsed", "1");
		const { fixture } = await renderLayout();

		expect(fixture.nativeElement.querySelector("aside")).toHaveClass(
			"w-[4.75rem]"
		);
	});

	it("keeps working when storage is unavailable", async () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});

		await expect(renderLayout()).resolves.toBeDefined();
	});
});
