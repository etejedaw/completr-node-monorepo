import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { type MockInstance } from "vitest";

import { UiDialog } from "./ui-dialog";

const OPENED_AT = 10_000;

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
	let clock: MockInstance<() => number>;

	beforeEach(() => {
		clock = vi.spyOn(performance, "now").mockReturnValue(OPENED_AT);
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
		clock.mockReturnValue(OPENED_AT + 1000);

		await pressBackdrop(opened);

		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("still ignores the backdrop 399 ms after opening and closes from 400 ms on", async () => {
		await render(DialogHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open dialog" })
		);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });

		clock.mockReturnValue(OPENED_AT + 399);
		await pressBackdrop(opened);
		expect(dialog()).toBeInTheDocument();

		clock.mockReturnValue(OPENED_AT + 400);
		await pressBackdrop(opened);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close when the press starts inside the dialog and ends on the backdrop", async () => {
		await render(DialogHost);
		await userEvent.click(
			screen.getByRole("button", { name: "Open dialog" })
		);
		const opened = await screen.findByRole("dialog", { name: "Edit game" });
		clock.mockReturnValue(OPENED_AT + 1000);

		await userEvent.pointer([
			{ keys: "[MouseLeft>]", target: screen.getByText("Body") },
			{ keys: "[/MouseLeft]", target: backdropOf(opened) }
		]);

		expect(dialog()).toBeInTheDocument();
	});
});

@Component({
	imports: [UiDialog],
	template: `
		<ui-dialog
			heading="Delete list"
			[icon]="icon()"
			tone="danger"
			eyebrow="Lists"
		>
			<span dialogLead class="lead-slot">Lead</span>
			<p>Body</p>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class IconDialogHost {
	readonly icon = signal<string | null>("delete");
}

describe("UiDialog header icon", () => {
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
		vi.unstubAllGlobals();
	});

	const header = () =>
		screen
			.getByRole("dialog", { name: "Delete list" })
			.querySelector("header") as HTMLElement;

	it("renders the icon hidden from assistive technologies with the tone colors", async () => {
		await render(IconDialogHost);
		const icon = header().querySelector('[aria-hidden="true"].rounded-xl')!;

		expect(icon.textContent?.trim()).toBe("delete");
		expect(icon.classList).toContain("text-danger");
		expect(header().style.getPropertyValue("--ui-tone")).toBe(
			"var(--color-danger)"
		);
	});

	it("replaces the lead slot while the icon is set and restores it without one", async () => {
		const { fixture } = await render(IconDialogHost);
		expect(header().querySelector(".lead-slot")).toBeNull();

		fixture.componentInstance.icon.set(null);
		fixture.detectChanges();

		expect(header().querySelector(".rounded-xl")).toBeNull();
	});

	it("keeps the dialog named by its heading, not by the icon or eyebrow", async () => {
		await render(IconDialogHost);

		expect(
			screen.getByRole("dialog", { name: "Delete list" })
		).toBeInTheDocument();
	});
});

@Component({
	imports: [UiDialog],
	template: `
		<ui-dialog
			heading="Saving changes"
			[dismissible]="dismissible()"
			(closed)="closedCount.set(closedCount() + 1)"
		>
			<p>Body</p>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class CloseButtonHost {
	readonly dismissible = signal(true);
	readonly closedCount = signal(0);
}

describe("UiDialog close button", () => {
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
		vi.unstubAllGlobals();
	});

	const closeButton = () =>
		screen.getByRole("button", { name: "Close Saving changes" });

	it("is the shared round icon button", async () => {
		await render(CloseButtonHost);

		expect(closeButton()).toHaveClass("ui-icon-button");
		expect(closeButton()).toHaveAttribute("data-shape", "circle");
		expect(closeButton()).toHaveAttribute("data-size", "lg");
		expect(closeButton()).not.toHaveAttribute("aria-disabled");
	});

	it("emits closed for each press", async () => {
		const { fixture } = await render(CloseButtonHost);

		await userEvent.dblClick(closeButton());

		expect(fixture.componentInstance.closedCount()).toBe(2);
	});

	it("stays focusable but does nothing while the dialog cannot be dismissed", async () => {
		const { fixture } = await render(CloseButtonHost);
		fixture.componentInstance.dismissible.set(false);
		fixture.detectChanges();

		expect(closeButton()).toHaveAttribute("aria-disabled", "true");
		expect(closeButton()).not.toBeDisabled();
		closeButton().focus();
		expect(closeButton()).toHaveFocus();
		await userEvent.click(closeButton());
		await userEvent.keyboard("{Enter}");

		expect(fixture.componentInstance.closedCount()).toBe(0);
	});

	it("closes again once the dialog becomes dismissible", async () => {
		const { fixture } = await render(CloseButtonHost);
		fixture.componentInstance.dismissible.set(false);
		fixture.detectChanges();
		await userEvent.click(closeButton());
		fixture.componentInstance.dismissible.set(true);
		fixture.detectChanges();

		await userEvent.click(closeButton());

		expect(fixture.componentInstance.closedCount()).toBe(1);
		expect(closeButton()).not.toHaveAttribute("aria-disabled");
	});
});
