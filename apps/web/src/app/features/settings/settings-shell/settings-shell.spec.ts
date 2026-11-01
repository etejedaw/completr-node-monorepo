import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, RouterOutlet } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, throwError } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type User } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { type GiftOffer } from "../../../shared/components/gift-offer-card/gift-offer-card.model";
import { SettingsShell } from "./settings-shell";

const OFFERS_URL = `${environment.apiUrl}/users/me/gift-offers`;

const PREMIUM_GIFT: GiftOffer = {
	code: "premium-week",
	feature: "*",
	availableFrom: "2026-10-01T00:00:00.000Z",
	availableUntil: "2099-12-01T00:00:00.000Z",
	status: "available",
	expiresAt: null,
	canActivate: true,
	hasAccess: false
};

@Component({
	selector: "app-stub-profile",
	template: `<p>Profile page</p>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class StubProfile {}

@Component({
	selector: "app-stub-security",
	template: `<p>Security page</p>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class StubSecurity {}

@Component({
	selector: "app-settings-host",
	imports: [RouterOutlet],
	template: `<router-outlet />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class SettingsHost {}

const routes = [
	{
		path: "settings",
		component: SettingsShell,
		children: [
			{ path: "profile", component: StubProfile },
			{ path: "security", component: StubSecurity }
		]
	}
];

describe("SettingsShell", () => {
	const user = signal<User | null>({ id: "u1", username: "ada" } as User);
	const loadUser = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		user.set({ id: "u1", username: "ada" } as User);
		loadUser.mockReset();
		loadUser.mockReturnValue(of({}));
	});

	afterEach(() => {
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(req =>
				req.flush(
					req.request.url === OFFERS_URL
						? { data: { offers: [] } }
						: { data: { backlog: [] } }
				)
			);
		vi.unstubAllGlobals();
	});

	async function renderShell(url = "/settings/profile") {
		return render(SettingsHost, {
			routes,
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: { user: user.asReadonly(), loadUser }
				}
			],
			initialRoute: url
		});
	}

	it("shows the Settings heading with its Account eyebrow", async () => {
		await renderShell();

		expect(
			screen.getByRole("heading", { name: "Settings" })
		).toBeInTheDocument();
		expect(screen.getByText("Account")).toBeInTheDocument();
	});

	it("links to the public profile of the signed-in user", async () => {
		await renderShell();

		expect(
			screen.getByRole("link", { name: /View public profile/ })
		).toHaveAttribute("href", "/user/ada");
	});

	it("hides the public profile link until the account is loaded", async () => {
		user.set(null);
		await renderShell();

		expect(
			screen.queryByRole("link", { name: /View public profile/ })
		).not.toBeInTheDocument();
	});

	it("renders the section navigation and the active child route", async () => {
		await renderShell("/settings/security");

		expect(
			screen.getByRole("navigation", { name: "Settings sections" })
		).toBeInTheDocument();
		expect(await screen.findByText("Security page")).toBeInTheDocument();
		expect(screen.queryByText("Profile page")).not.toBeInTheDocument();
	});

	it("swaps the child page when navigating between sections", async () => {
		await renderShell("/settings/profile");
		expect(await screen.findByText("Profile page")).toBeInTheDocument();

		await TestBed.inject(Router).navigateByUrl("/settings/security");

		expect(await screen.findByText("Security page")).toBeInTheDocument();
		expect(screen.queryByText("Profile page")).not.toBeInTheDocument();
	});

	it("loads the latest backlog entries for the hero posters", async () => {
		await renderShell();

		const req = TestBed.inject(HttpTestingController).expectOne(
			request => request.url === `${environment.apiUrl}/users/me/backlog`
		);
		expect(req.request.params.get("limit")).toBe("14");
		expect(req.request.params.get("sort_by")).toBe("createdAt");
		expect(req.request.params.get("sort_order")).toBe("desc");
		req.flush({ data: { backlog: [] } });
	});

	function http() {
		return TestBed.inject(HttpTestingController);
	}

	it("offers an available Premium gift above the section and refreshes the account after activating it", async () => {
		const user = userEvent.setup();
		await renderShell();
		http()
			.expectOne(OFFERS_URL)
			.flush({ data: { offers: [PREMIUM_GIFT] } });

		await user.dblClick(
			await screen.findByRole("button", { name: "Activate gift" })
		);
		const claims = http().match(`${OFFERS_URL}/premium-week/claim`);
		expect(claims).toHaveLength(1);
		claims[0].flush({
			data: {
				offer: {
					...PREMIUM_GIFT,
					status: "active",
					canActivate: false,
					hasAccess: true,
					expiresAt: PREMIUM_GIFT.availableUntil
				},
				created: true
			}
		});

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(loadUser).toHaveBeenCalledTimes(1);
		expect(await screen.findByText("Profile page")).toBeInTheDocument();
	});

	it("keeps the gift active when the account refresh fails", async () => {
		loadUser.mockReturnValue(throwError(() => new Error("offline")));
		await renderShell();
		http()
			.expectOne(OFFERS_URL)
			.flush({ data: { offers: [PREMIUM_GIFT] } });

		await userEvent.click(
			await screen.findByRole("button", { name: "Activate gift" })
		);
		http()
			.expectOne(`${OFFERS_URL}/premium-week/claim`)
			.flush({
				data: {
					offer: {
						...PREMIUM_GIFT,
						status: "active",
						canActivate: false
					},
					created: true
				}
			});

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows nothing when the Premium gift was already used", async () => {
		await renderShell();
		http()
			.expectOne(OFFERS_URL)
			.flush({
				data: {
					offers: [
						{ ...PREMIUM_GIFT, status: "used", canActivate: false },
						{
							...PREMIUM_GIFT,
							code: "lists",
							feature: "lists.unlimited"
						}
					]
				}
			});

		await waitFor(() =>
			expect(screen.getByText("Profile page")).toBeInTheDocument()
		);
		expect(
			screen.queryByRole("button", { name: "Activate gift" })
		).not.toBeInTheDocument();
	});

	it("keeps a single offers request while moving between sections", async () => {
		await renderShell("/settings/profile");
		http().expectOne(OFFERS_URL).flush(null, {
			status: 500,
			statusText: "Server Error"
		});

		await TestBed.inject(Router).navigateByUrl("/settings/security");

		expect(await screen.findByText("Security page")).toBeInTheDocument();
		http().expectNone(OFFERS_URL);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
