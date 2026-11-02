import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserInCommon } from "./user-in-common";

function comparison(titles: string[]) {
	return {
		inCommon: titles.map(title => ({
			id: title,
			code: title.toLowerCase(),
			title,
			backgroundUrl: null
		})),
		counts: { inCommon: titles.length }
	};
}

describe("User in common interaction", () => {
	const getComparison = vi.fn();

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

	function renderPage() {
		return render(UserInCommon, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: { get: () => "grace" },
							queryParamMap: { get: () => null }
						}
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => "jwt",
						user: signal({ id: "u1" }),
						isLoggedIn: signal(true),
						loadUser: vi.fn()
					}
				},
				{ provide: PublicLibraryService, useValue: { getComparison } }
			]
		});
	}

	function comparisonOption(name: string) {
		return within(
			screen.getByRole("radiogroup", { name: "Compare by" })
		).getByRole("radio", { name });
	}

	it("does not let a slow previous comparison overwrite the latest one", async () => {
		const user = userEvent.setup();
		const stale = new Subject<ReturnType<typeof comparison>>();
		const latest = new Subject<ReturnType<typeof comparison>>();
		getComparison.mockReturnValueOnce(of(comparison(["Initial"])));
		await renderPage();
		await screen.findAllByText("Initial");
		getComparison.mockReturnValueOnce(stale).mockReturnValueOnce(latest);

		await user.click(comparisonOption("To play"));
		await waitFor(() =>
			expect(getComparison).toHaveBeenCalledWith(
				"grace",
				"not_started",
				expect.anything()
			)
		);
		await user.click(comparisonOption("Completed"));
		await waitFor(() => expect(getComparison).toHaveBeenCalledTimes(3));
		expect(stale.observers).toHaveLength(0);

		latest.next(comparison(["Newest"]));
		latest.complete();
		await screen.findAllByText("Newest");
		stale.next(comparison(["Stale"]));
		stale.complete();

		await waitFor(() => {
			expect(screen.queryAllByText("Stale")).toHaveLength(0);
			expect(screen.getAllByText("Newest").length).toBeGreaterThan(0);
		});
	});

	it.each([0, 500])(
		"offers to try again after a %s failure instead of claiming the player is missing",
		async status => {
			const user = userEvent.setup();
			getComparison
				.mockReturnValueOnce(
					throwError(() => new HttpErrorResponse({ status }))
				)
				.mockReturnValueOnce(of(comparison(["Recovered"])));
			await renderPage();

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Couldn't load the in common"
			);
			expect(
				screen.queryByRole("heading", { name: "Player not found" })
			).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Try again" }));

			expect(await screen.findAllByText("Recovered")).not.toHaveLength(0);
			expect(getComparison).toHaveBeenCalledTimes(2);
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		}
	);
});
