import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ProfileCollectionPage } from "./profile-collection-page";

describe("ProfileCollectionPage", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage(
		inputs: Record<string, unknown> = {},
		on: Record<string, (value: never) => void> = {}
	) {
		return render(
			`<app-profile-collection-page
				[username]="username"
				[heading]="heading"
				icon="favorite"
				[total]="total"
				[itemCount]="itemCount"
				[visibleCount]="visibleCount"
				[isLoading]="isLoading"
				[error]="error"
				[privateTitle]="privateTitle"
				[noun]="noun"
				emptyTitle="No favorites yet"
				emptyText="They haven't picked any."
				(offsetChange)="offsetChange($event)"
			><p>collection body</p></app-profile-collection-page>`,
			{
				providers: [provideRouter([])],
				imports: [ProfileCollectionPage],
				componentProperties: {
					username: "ada",
					heading: "Favorites",
					total: 3,
					itemCount: 3,
					visibleCount: 3,
					isLoading: false,
					error: null,
					privateTitle: "These favorites are private",
					noun: "game",
					offsetChange: on["offsetChange"] ?? vi.fn(),
					...inputs
				}
			}
		);
	}

	it("shows the heading, a link back to the profile and the projected content", async () => {
		await renderPage();

		expect(
			screen.getByRole("heading", { name: "Favorites" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /@ada's profile/ })
		).toHaveAttribute("href", "/user/ada");
		expect(screen.getByText("collection body")).toBeInTheDocument();
	});

	it("counts the items with the right plural", async () => {
		await renderPage({ total: 3 });
		expect(screen.getByText(/games/)).toBeInTheDocument();
	});

	it("uses the singular for a single item", async () => {
		await renderPage({ total: 1, itemCount: 1, visibleCount: 1 });
		expect(screen.getByText(/\bgame\b/)).toBeInTheDocument();
		expect(screen.queryByText(/games/)).not.toBeInTheDocument();
	});

	it("replaces the whole page with the private state when access is forbidden", async () => {
		await renderPage({ error: "private" });

		expect(
			screen.getByRole("heading", { name: "These favorites are private" })
		).toBeInTheDocument();
		expect(
			screen.getByText("@ada doesn't share this publicly.")
		).toBeInTheDocument();
		expect(screen.queryByText("collection body")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Favorites" })
		).not.toBeInTheDocument();
	});

	it("replaces the whole page with the not-found state when the player does not exist", async () => {
		await renderPage({ error: "not_found" });

		expect(
			screen.getByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
		expect(screen.queryByText("collection body")).not.toBeInTheDocument();
	});

	it("shows the empty state with its own copy when there are no items", async () => {
		await renderPage({ total: 0, itemCount: 0, visibleCount: 0 });

		expect(screen.getByText("No favorites yet")).toBeInTheDocument();
		expect(
			screen.getByText("They haven't picked any.")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to profile" })
		).toHaveAttribute("href", "/user/ada");
	});

	it("tells the visitor nothing matches when the filter hides every item", async () => {
		await renderPage({ visibleCount: 0 });

		expect(
			screen.getByText(
				"Nothing on this page matches your search or platform."
			)
		).toBeInTheDocument();
	});

	it("shows a loading state while the collection loads", async () => {
		await renderPage({ isLoading: true, itemCount: 0, visibleCount: 0 });

		expect(screen.queryByText("No favorites yet")).not.toBeInTheDocument();
		expect(screen.queryByText("collection body")).not.toBeInTheDocument();
	});

	it("searches with a placeholder naming the owner", async () => {
		await renderPage();

		expect(
			screen.getByPlaceholderText("Search ada's favorites...")
		).toBeInTheDocument();
	});

	it("keeps the search box usable", async () => {
		const user = userEvent.setup();
		await renderPage();

		const search = screen.getByPlaceholderText("Search ada's favorites...");
		await user.type(search, "hades");

		expect(search).toHaveValue("hades");
	});
});
