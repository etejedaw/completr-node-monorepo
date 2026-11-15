import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { fireEvent, render, screen } from "@testing-library/angular";

import { BETA_SIGNUP_URL } from "../../shared/constants/beta-signup";
import { GuestShell } from "./guest-shell";

describe("GuestShell", () => {
	async function renderShell() {
		return render(GuestShell, { providers: [provideRouter([])] });
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
});
