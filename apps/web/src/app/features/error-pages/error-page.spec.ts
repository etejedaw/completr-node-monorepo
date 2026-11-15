import "@testing-library/jest-dom/vitest";

import { Location } from "@angular/common";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { AuthService } from "../../core/services/auth";
import { NotFound } from "./not-found";

describe("ErrorPage", () => {
	const isLoggedIn = signal(false);
	const historyLength = vi.spyOn(window.history, "length", "get");

	async function renderNotFound() {
		const result = await render(NotFound, {
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: { isLoggedIn } }
			]
		});
		const back = vi
			.spyOn(TestBed.inject(Location), "back")
			.mockImplementation(() => undefined);
		const navigate = vi
			.spyOn(TestBed.inject(Router), "navigateByUrl")
			.mockResolvedValue(true);
		return { result, back, navigate };
	}

	beforeEach(() => {
		isLoggedIn.set(false);
		historyLength.mockReturnValue(5);
	});

	afterAll(() => {
		historyLength.mockRestore();
	});

	it("offers the sign in link and no app links to a visitor", async () => {
		await renderNotFound();

		expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
			"href",
			"/login"
		);
		expect(
			screen.queryByRole("link", { name: /go to feed/i })
		).not.toBeInTheDocument();
	});

	it("offers the app links to a signed in user", async () => {
		isLoggedIn.set(true);
		await renderNotFound();

		expect(
			screen.getByRole("link", { name: /go to feed/i })
		).toHaveAttribute("href", "/feed");
		expect(
			screen.queryByRole("link", { name: /sign in/i })
		).not.toBeInTheDocument();
	});

	it("goes back once on a double click when there is history", async () => {
		const user = userEvent.setup();
		const { back } = await renderNotFound();

		await user.dblClick(screen.getByRole("button", { name: /go back/i }));

		expect(back).toHaveBeenCalled();
	});

	it("falls back to a safe route when the page was opened directly", async () => {
		const user = userEvent.setup();
		historyLength.mockReturnValue(1);
		const { back, navigate } = await renderNotFound();

		await user.click(screen.getByRole("button", { name: /go back/i }));

		expect(back).not.toHaveBeenCalled();
		expect(navigate).toHaveBeenCalledWith("/login");
	});
});
