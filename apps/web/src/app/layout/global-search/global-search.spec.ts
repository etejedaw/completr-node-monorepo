import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { provideRouter, Router } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of } from "rxjs";

import { GlobalSearchService } from "../../core/services/global-search";
import { type SearchResults } from "../../core/services/global-search.model";
import { PageSearchScope } from "../../core/services/page-search-scope";
import { PageSearch } from "../../shared/components/page-search/page-search";
import { GlobalSearch } from "./global-search";

type HostPage = "games" | "queue" | "feed";

@Component({
	imports: [GlobalSearch, PageSearch],
	template: `
		<button type="button">Outside</button>
		<app-global-search variant="inline" />
		@switch (page()) {
			@case ("games") {
				<app-page-search
					scopeLabel="My Games"
					placeholder="Filter by title..."
					[value]="gamesQuery()"
					(valueChange)="gamesQuery.set($event)"
				/>
			}
			@case ("queue") {
				<app-page-search
					scopeLabel="Up Next"
					placeholder="Filter Up Next..."
					[value]="queueQuery()"
					(valueChange)="queueQuery.set($event)"
				/>
			}
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	readonly page = signal<HostPage>("games");
	readonly gamesQuery = signal("");
	readonly queueQuery = signal("hollow");
}

const RESULTS: SearchResults = {
	games: [{ id: "g1", title: "Celeste", code: "celeste" }],
	users: [],
	lists: []
};

describe("GlobalSearch", () => {
	let search: ReturnType<typeof vi.fn>;

	async function renderHost(page: HostPage = "games") {
		search = vi.fn(() => of(RESULTS));
		const view = await render(Host, {
			providers: [
				provideRouter([]),
				PageSearchScope,
				{ provide: GlobalSearchService, useValue: { search } }
			]
		});
		view.fixture.componentInstance.page.set(page);
		await view.fixture.whenStable();
		return view;
	}

	const field = () => screen.getByRole("searchbox");
	const chip = () =>
		screen.queryByRole("button", {
			name: "Search all of Completr instead"
		});
	const status = () => screen.getByRole("status");

	describe("on a page without scope", () => {
		it("searches games, players and lists like before", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost("feed");
			const router = fixture.debugElement.injector.get(Router);
			const navigate = vi
				.spyOn(router, "navigate")
				.mockResolvedValue(true);

			expect(chip()).not.toBeInTheDocument();
			expect(field()).toHaveAccessibleName(
				"Search users, games or lists"
			);
			expect(field()).toHaveAttribute(
				"placeholder",
				"Search games, players, lists..."
			);

			await user.type(field(), "ce");
			expect(await screen.findByText("Celeste")).toBeInTheDocument();
			expect(search).toHaveBeenLastCalledWith("ce");
			await user.keyboard("{Enter}");

			expect(navigate).toHaveBeenCalledWith(["/games"], {
				queryParams: { q: "ce" }
			});
			expect(status()).toHaveTextContent("");
		});

		it("focuses the bar with the slash shortcut", async () => {
			const user = userEvent.setup();
			await renderHost("feed");

			await user.click(screen.getByRole("button", { name: "Outside" }));
			await user.keyboard("/");

			expect(field()).toHaveFocus();
			expect(field()).toHaveValue("");
		});
	});

	describe("on a page with scope", () => {
		it("shows the scope chip and filters the page while typing", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			expect(chip()).toBeInTheDocument();
			expect(screen.getByText("In My Games")).toBeInTheDocument();
			expect(field()).toHaveAccessibleName("Filter My Games");
			expect(field()).toHaveAttribute(
				"placeholder",
				"Filter by title..."
			);
			expect(status()).toHaveTextContent("Filtering My Games");

			await user.type(field(), "cel");

			expect(fixture.componentInstance.gamesQuery()).toBe("cel");
			const results = screen.getByRole("region", {
				name: "Search results"
			});
			expect(
				within(results).getByText("Filtering My Games")
			).toBeVisible();
			expect(
				within(results).getByRole("button", {
					name: /Search "cel" in all of Completr/
				})
			).toBeInTheDocument();
			expect(search).not.toHaveBeenCalledWith("cel");
		});

		it("moves the text to the global search when the chip is removed", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.type(field(), "cel");
			await user.click(chip() as HTMLElement);

			expect(chip()).not.toBeInTheDocument();
			expect(fixture.componentInstance.gamesQuery()).toBe("");
			expect(field()).toHaveValue("cel");
			expect(field()).toHaveFocus();
			expect(field()).toHaveAccessibleName(
				"Search users, games or lists"
			);
			expect(status()).toHaveTextContent("Searching all of Completr");
			expect(await screen.findByText("Celeste")).toBeInTheDocument();
			expect(search).toHaveBeenLastCalledWith("cel");
		});

		it("searches everywhere from the dropdown action", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.type(field(), "cel");
			await user.click(
				screen.getByRole("button", {
					name: /Search "cel" in all of Completr/
				})
			);

			expect(chip()).not.toBeInTheDocument();
			expect(fixture.componentInstance.gamesQuery()).toBe("");
			expect(field()).toHaveValue("cel");
			expect(field()).toHaveFocus();
		});

		it("removes the chip with Backspace on an empty field only once", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.type(field(), "ab");
			await user.keyboard("{Backspace}{Backspace}");
			expect(chip()).toBeInTheDocument();
			expect(fixture.componentInstance.gamesQuery()).toBe("");

			await user.keyboard("{Backspace}");
			expect(chip()).not.toBeInTheDocument();
			await user.keyboard("{Backspace}");

			expect(chip()).not.toBeInTheDocument();
			expect(field()).toHaveValue("");
			expect(field()).toHaveFocus();
		});

		it("puts the chip back with the typed text from the global dropdown", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.click(field());
			await user.keyboard("{Backspace}");
			await user.type(field(), "zel");
			await user.click(
				await screen.findByRole("button", {
					name: 'Filter My Games by "zel"'
				})
			);

			expect(chip()).toBeInTheDocument();
			expect(fixture.componentInstance.gamesQuery()).toBe("zel");
			expect(field()).toHaveValue("zel");
			expect(field()).toHaveFocus();
			expect(status()).toHaveTextContent("Filtering My Games");

			await user.click(chip() as HTMLElement);
			await user.click(
				await screen.findByRole("button", {
					name: 'Filter My Games by "zel"'
				})
			);
			expect(fixture.componentInstance.gamesQuery()).toBe("zel");
		});

		it("clears the text first with Escape and then leaves the field", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.type(field(), "cel");
			await user.keyboard("{Escape}");
			expect(fixture.componentInstance.gamesQuery()).toBe("");
			expect(field()).toHaveValue("");
			expect(field()).toHaveFocus();

			await user.keyboard("{Escape}");
			expect(field()).not.toHaveFocus();
			await user.keyboard("{Escape}");

			expect(chip()).toBeInTheDocument();
			expect(fixture.componentInstance.gamesQuery()).toBe("");
		});

		it("follows the page when navigating in the middle of typing", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.type(field(), "ce");
			fixture.componentInstance.page.set("queue");
			await fixture.whenStable();

			expect(screen.getByText("In Up Next")).toBeInTheDocument();
			expect(field()).toHaveValue("hollow");
			expect(field()).toHaveAccessibleName("Filter Up Next");
			expect(status()).toHaveTextContent("Filtering Up Next");

			await user.type(field(), "k");
			expect(fixture.componentInstance.queueQuery()).toBe("hollowk");

			fixture.componentInstance.page.set("feed");
			await fixture.whenStable();

			expect(chip()).not.toBeInTheDocument();
			expect(field()).toHaveValue("");
			expect(
				screen.queryByRole("region", { name: "Search results" })
			).not.toBeInTheDocument();
		});

		it("brings the chip back on the next page after it was removed", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost();

			await user.click(chip() as HTMLElement);
			await user.type(field(), "ce");
			fixture.componentInstance.page.set("queue");
			await fixture.whenStable();

			expect(screen.getByText("In Up Next")).toBeInTheDocument();
			expect(field()).toHaveValue("hollow");
		});

		it("survives a scope that registers and goes away with the dropdown open", async () => {
			const user = userEvent.setup();
			const { fixture } = await renderHost("feed");

			await user.type(field(), "ce");
			expect(await screen.findByText("Celeste")).toBeInTheDocument();

			fixture.componentInstance.page.set("games");
			await fixture.whenStable();
			expect(chip()).toBeInTheDocument();
			expect(field()).toHaveValue("");
			expect(
				screen.queryByRole("region", { name: "Search results" })
			).not.toBeInTheDocument();

			await user.type(field(), "x");
			expect(
				screen.getByRole("region", { name: "Search results" })
			).toBeInTheDocument();
			fixture.componentInstance.page.set("feed");
			await fixture.whenStable();

			expect(chip()).not.toBeInTheDocument();
			expect(field()).toHaveValue("");
			await waitFor(() =>
				expect(
					screen.queryByRole("region", { name: "Search results" })
				).not.toBeInTheDocument()
			);
		});

		it("keeps a single search landmark", async () => {
			await renderHost();

			expect(screen.getAllByRole("search")).toHaveLength(1);
		});
	});
});
