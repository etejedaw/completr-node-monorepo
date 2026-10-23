import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, RouterOutlet } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { environment } from "../../../../environments/environment";
import { type User } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { SettingsShell } from "./settings-shell";

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
	});

	afterEach(() => {
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(req => req.flush({ data: { backlog: [] } }));
		vi.unstubAllGlobals();
	});

	async function renderShell(url = "/settings/profile") {
		return render(SettingsHost, {
			routes,
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { user: user.asReadonly() } }
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
});
