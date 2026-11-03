import "@testing-library/jest-dom/vitest";

import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { UsersService } from "../../core/services/users";
import { PageSearch } from "../../shared/components/page-search/page-search";
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
		const { fixture } = await renderPage();

		const pageSearch = fixture.debugElement.query(By.directive(PageSearch));
		expect(pageSearch.componentInstance.scopeLabel()).toBe("Users");
		expect(
			screen.getByRole("textbox", { name: "Filter by name or username" })
		).toBeInTheDocument();
	});
});
