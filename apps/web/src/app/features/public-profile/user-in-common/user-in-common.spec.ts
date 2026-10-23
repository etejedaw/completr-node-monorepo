import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserInCommon } from "./user-in-common";

function comparison(titles: string[], total = titles.length) {
	return {
		inCommon: titles.map(title => ({
			id: title,
			code: title.toLowerCase(),
			title,
			backgroundUrl: null
		})),
		counts: { inCommon: total }
	};
}

describe("UserInCommon", () => {
	const getComparison = vi.fn();
	const token = signal<string | null>(null);

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getComparison.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage({
		loggedIn = true,
		by = null
	}: { loggedIn?: boolean; by?: string | null } = {}) {
		token.set(loggedIn ? "jwt" : null);
		return render(UserInCommon, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: { get: () => "grace" },
							queryParamMap: { get: () => by }
						}
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => token(),
						user: signal({ id: "u1" }),
						isLoggedIn: signal(loggedIn),
						loadUser: vi.fn()
					}
				},
				{ provide: PublicLibraryService, useValue: { getComparison } }
			]
		});
	}

	it("asks signed-out visitors to sign in without requesting the comparison", async () => {
		await renderPage({ loggedIn: false });

		expect(
			screen.getByText("Sign in to compare libraries")
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
			"href",
			"/login"
		);
		expect(
			screen.getByRole("link", { name: "Back to profile" })
		).toHaveAttribute("href", "/user/grace");
		expect(getComparison).not.toHaveBeenCalled();
	});

	it("compares completed games by default and lists the ones both players share", async () => {
		getComparison.mockReturnValue(of(comparison(["Hades", "Celeste"])));
		await renderPage();

		expect(await screen.findAllByText("Hades")).not.toHaveLength(0);
		expect(getComparison).toHaveBeenCalledWith("grace", "completed", {
			limit: 50,
			offset: 0
		});
		expect(screen.getByText(/you both completed/)).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: "Completed" })
		).toHaveAttribute("aria-checked", "true");
	});

	it("starts on the dimension requested in the link", async () => {
		getComparison.mockReturnValue(of(comparison(["Hades"])));
		await renderPage({ by: "not_started" });

		await screen.findAllByText("Hades");
		expect(getComparison).toHaveBeenCalledWith(
			"grace",
			"not_started",
			expect.anything()
		);
		expect(
			screen.getByText(/you both have yet to play/)
		).toBeInTheDocument();
	});

	it("falls back to completed when the link asks for an unknown dimension", async () => {
		getComparison.mockReturnValue(of(comparison(["Hades"])));
		await renderPage({ by: "wishlist" });

		await screen.findAllByText("Hades");
		expect(getComparison).toHaveBeenCalledWith(
			"grace",
			"completed",
			expect.anything()
		);
	});

	it("loads the other comparison when the visitor switches dimension", async () => {
		const user = userEvent.setup();
		getComparison.mockReturnValue(of(comparison(["Hades"])));
		await renderPage();
		await screen.findAllByText("Hades");
		getComparison.mockClear();
		getComparison.mockReturnValue(of(comparison(["Celeste"])));

		await user.click(
			within(
				screen.getByRole("radiogroup", { name: "Compare by" })
			).getByRole("radio", { name: "To play" })
		);

		expect(getComparison).toHaveBeenCalledWith("grace", "not_started", {
			limit: 50,
			offset: 0
		});
		expect(await screen.findAllByText("Celeste")).not.toHaveLength(0);
	});

	it("shows the private state when the other library is private", async () => {
		getComparison.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "This part of their library is private"
			})
		).toBeInTheDocument();
	});

	it("shows the empty state when nothing is shared", async () => {
		getComparison.mockReturnValue(of(comparison([])));
		await renderPage();

		expect(
			await screen.findByText("Nothing in common yet")
		).toBeInTheDocument();
	});
});
