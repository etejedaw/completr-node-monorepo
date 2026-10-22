import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { SETTINGS_SECTIONS } from "../settings-sections";
import { SettingsNav } from "./settings-nav";

@Component({
	selector: "app-stub-page",
	template: ``,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class StubPage {}

const routes = SETTINGS_SECTIONS.map(section => ({
	path: `settings/${section.path}`,
	component: StubPage
}));

function stubMatchMedia() {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}))
	);
}

describe("SettingsNav", () => {
	beforeEach(stubMatchMedia);

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("rail variant", () => {
		it("links every section to its settings page", async () => {
			await render(SettingsNav, { routes });

			const nav = screen.getByRole("navigation", {
				name: "Settings sections"
			});
			for (const section of SETTINGS_SECTIONS) {
				const link = screen.getByRole("link", {
					name: new RegExp(section.label)
				});
				expect(nav).toContainElement(link);
				expect(link).toHaveAttribute(
					"href",
					`/settings/${section.path}`
				);
			}
		});

		it("shows each section description", async () => {
			await render(SettingsNav, { routes });

			expect(
				screen.getByText("Name, bio and avatar")
			).toBeInTheDocument();
			expect(
				screen.getByText("Password and sessions")
			).toBeInTheDocument();
		});

		it("marks only the current section as the current page", async () => {
			await render(SettingsNav, { routes });
			await TestBed.inject(Router).navigateByUrl("/settings/appearance");

			expect(
				await screen.findByRole("link", { name: /Appearance/ })
			).toHaveAttribute("aria-current", "page");
			expect(
				screen.getByRole("link", { name: /Security/ })
			).not.toHaveAttribute("aria-current");
		});

		it("moves the current page mark when navigating", async () => {
			await render(SettingsNav, { routes });
			const router = TestBed.inject(Router);

			await router.navigateByUrl("/settings/profile");
			expect(
				await screen.findByRole("link", { name: /Profile/ })
			).toHaveAttribute("aria-current", "page");

			await router.navigateByUrl("/settings/security");
			expect(
				await screen.findByRole("link", { name: /Security/ })
			).toHaveAttribute("aria-current", "page");
			expect(
				screen.getByRole("link", { name: /Profile/ })
			).not.toHaveAttribute("aria-current");
		});
	});

	describe("chips variant", () => {
		it("renders a section picker instead of the rail", async () => {
			await render(SettingsNav, { routes, inputs: { variant: "chips" } });

			expect(
				screen.queryByRole("navigation", { name: "Settings sections" })
			).not.toBeInTheDocument();
			expect(screen.getAllByText("Section").length).toBeGreaterThan(0);
		});

		it("shows the label of the section in the current url", async () => {
			await render(SettingsNav, {
				routes,
				inputs: { variant: "chips" }
			});
			await TestBed.inject(Router).navigateByUrl("/settings/security");

			expect(await screen.findByText("Security")).toBeInTheDocument();
		});
	});
});
