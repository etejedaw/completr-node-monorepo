import "@testing-library/jest-dom/vitest";

import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of } from "rxjs";

import { GlobalSearchService } from "../../core/services/global-search";
import { PageSearchScope } from "../../core/services/page-search-scope";
import { PageSearch } from "../../shared/components/page-search/page-search";
import { MobileSearchOverlay } from "../mobile-search-overlay/mobile-search-overlay";
import { GlobalSearch } from "./global-search";

@Component({
	imports: [GlobalSearch, MobileSearchOverlay, PageSearch],
	template: `
		@if (pageSearchScope.hasScope()) {
			<app-global-search
				variant="compact"
				(searchedEverywhere)="openSearch($event)"
			/>
		} @else {
			<button type="button" (click)="openSearch('')">Search</button>
		}
		@if (open()) {
			<app-mobile-search-overlay
				[initialQuery]="initialQuery()"
				(closed)="open.set(false); closedCount.set(closedCount() + 1)"
			/>
		}
		@if (showPage()) {
			<app-page-search
				scopeLabel="My Games"
				placeholder="Filter by title..."
				[value]="gamesQuery()"
				(valueChange)="gamesQuery.set($event)"
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	protected readonly pageSearchScope = inject(PageSearchScope);
	readonly showPage = signal(true);
	readonly gamesQuery = signal("");
	readonly open = signal(false);
	readonly initialQuery = signal("");
	readonly closedCount = signal(0);

	openSearch(query: string) {
		this.initialQuery.set(query);
		this.open.set(true);
	}
}

describe("GlobalSearch compact variant", () => {
	let search: ReturnType<typeof vi.fn>;

	async function renderHost() {
		search = vi.fn(() =>
			of({
				games: [{ id: "g1", title: "Celeste", code: "celeste" }],
				users: [],
				lists: []
			})
		);
		return render(Host, {
			providers: [
				provideRouter([]),
				PageSearchScope,
				{ provide: GlobalSearchService, useValue: { search } }
			]
		});
	}

	const filterField = () =>
		screen.getByRole("searchbox", { name: "Filter My Games" });
	const chip = () =>
		screen.queryByRole("button", {
			name: "Search all of Completr instead"
		});
	const overlay = () => screen.queryByRole("dialog", { name: "Search" });

	it("shows the scoped field instead of the search button and filters the page", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		expect(
			screen.queryByRole("button", { name: "Search" })
		).not.toBeInTheDocument();
		expect(screen.getByText("In My Games")).toBeInTheDocument();
		expect(filterField()).toHaveAttribute(
			"placeholder",
			"Filter by title..."
		);

		await user.type(filterField(), "cel");

		expect(fixture.componentInstance.gamesQuery()).toBe("cel");
		expect(overlay()).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Filtering My Games"
		);
	});

	it("clears the filter with the clear button and keeps the focus in the field", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.type(filterField(), "cel");
		await user.click(screen.getByRole("button", { name: "Clear search" }));

		expect(fixture.componentInstance.gamesQuery()).toBe("");
		expect(filterField()).toHaveFocus();
	});

	it("opens the global search with the text when the chip is removed", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.type(filterField(), "cel");
		await user.click(chip() as HTMLElement);

		const dialog = await screen.findByRole("dialog", { name: "Search" });
		expect(fixture.componentInstance.gamesQuery()).toBe("");
		expect(within(dialog).getByRole("searchbox")).toHaveValue("cel");
		expect(await within(dialog).findByText("Celeste")).toBeInTheDocument();
		expect(search).toHaveBeenLastCalledWith("cel");
	});

	it("opens the overlay once with a double Backspace on the empty field", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(filterField());
		await user.keyboard("{Backspace}");
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await waitFor(() =>
			expect(within(dialog).getByRole("searchbox")).toHaveFocus()
		);
		await user.keyboard("{Backspace}");

		expect(screen.getAllByRole("dialog", { name: "Search" })).toHaveLength(
			1
		);
		expect(fixture.componentInstance.closedCount()).toBe(0);
	});

	it("filters the page again from the overlay and closes it", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(chip() as HTMLElement);
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await user.type(within(dialog).getByRole("searchbox"), "zel");
		await user.click(
			within(dialog).getByRole("button", {
				name: 'Filter My Games by "zel"'
			})
		);

		await waitFor(() => expect(overlay()).not.toBeInTheDocument());
		expect(fixture.componentInstance.closedCount()).toBe(1);
		expect(fixture.componentInstance.gamesQuery()).toBe("zel");
		expect(filterField()).toHaveValue("zel");
	});

	it("hides the filter action when the page scope goes away with the overlay open", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(chip() as HTMLElement);
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await user.type(within(dialog).getByRole("searchbox"), "zel");
		fixture.componentInstance.showPage.set(false);
		await fixture.whenStable();

		expect(
			within(dialog).queryByRole("button", { name: /Filter My Games/ })
		).not.toBeInTheDocument();
		expect(overlay()).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Search" })
		).toBeInTheDocument();
	});

	it("clears with Escape before leaving the field and never opens the overlay", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.type(filterField(), "cel");
		await user.keyboard("{Escape}");
		expect(fixture.componentInstance.gamesQuery()).toBe("");
		expect(filterField()).toHaveFocus();
		await user.keyboard("{Escape}");
		await user.keyboard("{Escape}");

		expect(filterField()).not.toHaveFocus();
		expect(overlay()).not.toBeInTheDocument();
		expect(chip()).toBeInTheDocument();
	});

	it("gives 44px touch targets to the field", async () => {
		await renderHost();

		expect(filterField().closest("label")).toHaveClass("min-h-[44px]");
		expect(chip()).toHaveClass("tap-area");
	});
});
