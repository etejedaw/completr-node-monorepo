import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { fireEvent, render, screen } from "@testing-library/angular";

import { BETA_SIGNUP_URL } from "../../shared/constants/beta-signup";
import { GuestShell } from "./guest-shell";

@Component({
	selector: "app-page-stub",
	template: `<h1>Page</h1>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class PageStub {}

describe("GuestShell", () => {
	async function renderShell() {
		return render(GuestShell, {
			providers: [
				provideRouter([
					{ path: "user/:username/rewind/:year", component: PageStub }
				])
			]
		});
	}

	it("offers sign in and the beta signup to visitors", async () => {
		await renderShell();

		expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
			"href",
			"/login"
		);
		expect(
			screen.getByRole("link", { name: "Join the beta" })
		).toHaveAttribute("href", BETA_SIGNUP_URL);
	});

	it("blurs the header only after scrolling, and un-blurs it when back at the top", async () => {
		const { container } = await renderShell();
		const main = container.querySelector("main") as HTMLElement;
		const header = container.querySelector("header") as HTMLElement;

		main.scrollTop = 200;
		fireEvent.scroll(main);
		expect(header).toHaveClass("backdrop-blur-xl");

		main.scrollTop = 0;
		fireEvent.scroll(main);
		expect(header).not.toHaveClass("backdrop-blur-xl");
	});

	it("keeps the header steady on a burst of scroll events with garbage positions", async () => {
		const { container } = await renderShell();
		const main = container.querySelector("main") as HTMLElement;
		const header = container.querySelector("header") as HTMLElement;

		for (const position of [-50, 0, 9, 9, Number.MAX_SAFE_INTEGER, 0]) {
			main.scrollTop = position;
			fireEvent.scroll(main);
		}

		expect(header).not.toHaveClass("backdrop-blur-xl");
	});

	it("gives visitors a skip link that lands on the main content", async () => {
		await renderShell();
		const skipLink = screen.getByRole("link", { name: "Skip to content" });

		fireEvent.click(skipLink);

		expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
		expect(screen.getByRole("main")).toHaveFocus();
	});

	it("opens the next rewind at the top after reading the previous one to the bottom", async () => {
		await renderShell();
		const router = TestBed.inject(Router);
		const main = screen.getByRole("main");
		await router.navigateByUrl("/user/etejedaw/rewind/2025");

		main.scrollTop = 6000;
		fireEvent.scroll(main);
		await router.navigateByUrl("/user/etejedaw/rewind/2026");

		expect(main.scrollTop).toBe(0);
	});
});
