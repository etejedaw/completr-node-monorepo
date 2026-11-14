import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { UsersService } from "../../core/services/users";
import { UsersDiscover } from "./users-discover";

describe("UsersDiscover", () => {
	async function renderPage() {
		return render(UsersDiscover, {
			providers: [
				provideRouter([]),
				{
					provide: UsersService,
					useValue: { discover: () => of([]), search: () => of([]) }
				},
				{
					provide: AuthService,
					useValue: { isLoggedIn: () => false }
				}
			]
		});
	}

	it("filters through the page search scoped to Users", async () => {
		await renderPage();

		expect(
			screen.getByRole("textbox", {
				name: "Filter players by name or username"
			})
		).toBeInTheDocument();
	});
});
