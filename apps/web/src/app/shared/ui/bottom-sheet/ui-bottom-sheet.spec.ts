import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { type MockInstance } from "vitest";

import { UiBottomSheet } from "./ui-bottom-sheet";

const OPENED_AT = 10_000;

@Component({
	imports: [UiBottomSheet],
	template: `
		<button type="button" (click)="open.set(true)">Open sheet</button>
		@if (open()) {
			<ui-bottom-sheet heading="Sort by" (closed)="open.set(false)">
				<p>Options</p>
			</ui-bottom-sheet>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class SheetHost {
	readonly open = signal(false);
}

const sheet = () => screen.queryByRole("dialog", { name: "Sort by" });
const backdrop = () => screen.getByRole("button", { name: "Close Sort by" });

describe("UiBottomSheet backdrop", () => {
	let clock: MockInstance<() => number>;

	beforeEach(() => {
		clock = vi.spyOn(performance, "now").mockReturnValue(OPENED_AT);
	});

	afterEach(() => vi.restoreAllMocks());

	it("stays open when a double tap on the opener lands on the backdrop", async () => {
		await render(SheetHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open sheet" })
		);
		await screen.findByRole("dialog", { name: "Sort by" });

		await userEvent.click(backdrop());

		expect(sheet()).toBeInTheDocument();
	});

	it("closes from the backdrop once the opening moment has passed", async () => {
		await render(SheetHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open sheet" })
		);
		await screen.findByRole("dialog", { name: "Sort by" });
		clock.mockReturnValue(OPENED_AT + 1000);

		await userEvent.click(backdrop());

		await waitFor(() => expect(sheet()).toBeNull());
	});

	it("still ignores the backdrop 399 ms after opening and closes from 400 ms on", async () => {
		await render(SheetHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open sheet" })
		);
		await screen.findByRole("dialog", { name: "Sort by" });

		clock.mockReturnValue(OPENED_AT + 399);
		await userEvent.click(backdrop());
		expect(sheet()).toBeInTheDocument();

		clock.mockReturnValue(OPENED_AT + 400);
		await userEvent.click(backdrop());
		await waitFor(() => expect(sheet()).toBeNull());
	});
});
