import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { UiDialog } from "./ui-dialog";

@Component({
	imports: [UiDialog],
	template: `
		<button type="button" (click)="open.set(true)">Open dialog</button>
		@if (open()) {
			<ui-dialog heading="Edit game" (closed)="open.set(false)">
				<p>Body</p>
			</ui-dialog>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class DialogHost {
	readonly open = signal(false);
}

const dialog = () => screen.queryByRole("dialog", { name: "Edit game" });
const backdropOf = (element: HTMLElement) =>
	element.parentElement!.firstElementChild as HTMLElement;
const pressBackdrop = (element: HTMLElement) =>
	userEvent.pointer([
		{ keys: "[MouseLeft>]", target: backdropOf(element) },
		{ keys: "[/MouseLeft]", target: backdropOf(element) }
	]);

describe("UiDialog backdrop", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("stays open when the second click of a double click lands on the backdrop", async () => {
		await render(DialogHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open dialog" })
		);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });

		await pressBackdrop(opened);

		expect(dialog()).toBeInTheDocument();
	});

	it("stays open after a fast triple click on the opener followed by backdrop presses", async () => {
		await render(DialogHost);
		const opener = screen.getByRole("button", { name: "Open dialog" });
		await userEvent.tripleClick(opener);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });

		await pressBackdrop(opened);
		await pressBackdrop(opened);

		expect(screen.getAllByRole("dialog")).toHaveLength(1);
		expect(dialog()).toBeInTheDocument();
	});

	it("closes from the backdrop once the opening moment has passed", async () => {
		await render(DialogHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open dialog" })
		);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });
		const openedAt = performance.now();
		vi.spyOn(performance, "now").mockReturnValue(openedAt + 1000);

		await pressBackdrop(opened);

		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close when the press starts inside the dialog and ends on the backdrop", async () => {
		await render(DialogHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open dialog" })
		);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });
		const openedAt = performance.now();
		vi.spyOn(performance, "now").mockReturnValue(openedAt + 1000);

		await userEvent.pointer([
			{ keys: "[MouseLeft>]", target: screen.getByText("Body") },
			{ keys: "[/MouseLeft]", target: backdropOf(opened) }
		]);

		expect(dialog()).toBeInTheDocument();
	});
});
