import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { MobileSearchOverlay } from "./mobile-search-overlay";

@Component({
	imports: [MobileSearchOverlay],
	template: `
		<button type="button" (click)="open.set(true)">Search</button>
		@if (open()) {
			<app-mobile-search-overlay
				[initialQuery]="initialQuery()"
				(closed)="open.set(false); closedCount.set(closedCount() + 1)"
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	readonly open = signal(false);
	readonly initialQuery = signal("");
	readonly closedCount = signal(0);
}

describe("MobileSearchOverlay", () => {
	async function renderHost() {
		const view = await render(Host, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
		return view;
	}

	const opener = () => screen.getByRole("button", { name: "Search" });
	const overlay = () => screen.queryByRole("dialog", { name: "Search" });

	it("opens as a modal dialog in the body with the search field focused", async () => {
		const user = userEvent.setup();
		await renderHost();

		await user.click(opener());

		const dialog = await screen.findByRole("dialog", { name: "Search" });
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog.parentElement).toBe(document.body);
		await waitFor(() =>
			expect(within(dialog).getByRole("searchbox")).toHaveFocus()
		);
	});

	it("closes with Escape once and gives the focus back to the opener", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(opener());
		await screen.findByRole("dialog", { name: "Search" });
		await user.keyboard("{Escape}");

		await waitFor(() => expect(overlay()).not.toBeInTheDocument());
		expect(fixture.componentInstance.closedCount()).toBe(1);
		await waitFor(() => expect(opener()).toHaveFocus());
	});

	it("closes from Cancel even when it is pressed twice", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(opener());
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await user.dblClick(
			within(dialog).getByRole("button", { name: "Cancel" })
		);

		await waitFor(() => expect(overlay()).not.toBeInTheDocument());
		expect(fixture.componentInstance.closedCount()).toBe(1);
		await waitFor(() => expect(opener()).toHaveFocus());
	});

	it("keeps the focus inside while tabbing", async () => {
		const user = userEvent.setup();
		await renderHost();

		await user.click(opener());
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await waitFor(() =>
			expect(within(dialog).getByRole("searchbox")).toHaveFocus()
		);
		await user.tab();
		await user.tab();
		await user.tab();

		expect(dialog).toContainElement(document.activeElement as HTMLElement);
	});

	it("can be opened again after closing", async () => {
		const user = userEvent.setup();
		await renderHost();

		await user.click(opener());
		await screen.findByRole("dialog", { name: "Search" });
		await user.keyboard("{Escape}");
		await waitFor(() => expect(overlay()).not.toBeInTheDocument());
		await user.click(opener());

		expect(
			await screen.findByRole("dialog", { name: "Search" })
		).toBeInTheDocument();
	});

	it("starts with the text it was opened with", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		fixture.componentInstance.initialQuery.set("hades");
		await user.click(opener());

		const dialog = await screen.findByRole("dialog", { name: "Search" });
		expect(within(dialog).getByRole("searchbox")).toHaveValue("hades");
	});

	it("clears the text with the first Escape and closes with the next ones only once", async () => {
		const user = userEvent.setup();
		const { fixture } = await renderHost();

		await user.click(opener());
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		const field = within(dialog).getByRole("searchbox");
		await waitFor(() => expect(field).toHaveFocus());
		await user.type(field, "ce");
		await user.keyboard("{Escape}");

		expect(overlay()).toBeInTheDocument();
		expect(field).toHaveValue("");

		await user.keyboard("{Escape}{Escape}");

		await waitFor(() => expect(overlay()).not.toBeInTheDocument());
		expect(fixture.componentInstance.closedCount()).toBe(1);
	});

	it("does not offer to filter a page when there is no page scope", async () => {
		const user = userEvent.setup();
		await renderHost();

		await user.click(opener());
		const dialog = await screen.findByRole("dialog", { name: "Search" });
		await user.type(within(dialog).getByRole("searchbox"), "ce");

		expect(
			within(dialog).queryByRole("button", { name: /^Filter / })
		).not.toBeInTheDocument();
	});
});
