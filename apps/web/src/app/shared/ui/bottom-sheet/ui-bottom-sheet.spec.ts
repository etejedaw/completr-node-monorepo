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

@Component({
	imports: [UiBottomSheet],
	template: `
		<ui-bottom-sheet
			heading="Filters"
			[subheading]="subheading()"
			[eyebrow]="eyebrow()"
			[variant]="variant()"
			[icon]="icon()"
			tone="premium"
			(closed)="closedCount.set(closedCount() + 1)"
		>
			<p>Body</p>
		</ui-bottom-sheet>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class VariantSheetHost {
	readonly eyebrow = signal<string | null>(null);
	readonly subheading = signal<string | null>("3 active");
	readonly variant = signal<"panel" | "menu" | null>(null);
	readonly icon = signal<string | null>(null);
	readonly closedCount = signal(0);
}

describe("UiBottomSheet header variant", () => {
	const header = () =>
		screen
			.getByRole("dialog", { name: "Filters" })
			.querySelector("header") as HTMLElement;
	const hasHalo = () => header().className.includes("radial-gradient");

	it("keeps a menu light, without the halo or the separator", async () => {
		await render(VariantSheetHost);

		expect(hasHalo()).toBe(false);
		expect(header().classList).not.toContain("border-b");
		expect(
			screen.getByRole("heading", { name: "Filters" }).classList
		).toContain("text-lg");
	});

	it("gives a sheet with an eyebrow the panel header with the tone halo", async () => {
		const { fixture } = await render(VariantSheetHost);
		fixture.componentInstance.eyebrow.set("My Games");
		fixture.detectChanges();

		expect(hasHalo()).toBe(true);
		expect(header().classList).toContain("border-b");
		expect(header().style.getPropertyValue("--dialog-tone")).toBe(
			"var(--color-premium)"
		);
		expect(
			screen.getByRole("heading", { name: "Filters" }).classList
		).toContain("text-xl");
	});

	it("lets the explicit variant win over the eyebrow rule", async () => {
		const { fixture } = await render(VariantSheetHost);
		fixture.componentInstance.variant.set("panel");
		fixture.detectChanges();
		expect(hasHalo()).toBe(true);

		fixture.componentInstance.eyebrow.set("My Games");
		fixture.componentInstance.variant.set("menu");
		fixture.detectChanges();
		expect(hasHalo()).toBe(false);
	});

	it("shows the tone icon only on panels", async () => {
		const { fixture } = await render(VariantSheetHost);
		fixture.componentInstance.icon.set("tune");
		fixture.detectChanges();
		expect(header().querySelector(".rounded-xl")).toBeNull();

		fixture.componentInstance.variant.set("panel");
		fixture.detectChanges();
		const icon = header().querySelector('[aria-hidden="true"].rounded-xl')!;
		expect(icon.textContent?.trim()).toBe("tune");
		expect(icon.classList).toContain("text-premium");
	});

	it("names and describes the sheet by its header in both variants", async () => {
		const { fixture } = await render(VariantSheetHost);
		expect(
			screen.getByRole("dialog", { name: "Filters" })
		).toHaveAccessibleDescription("3 active");

		fixture.componentInstance.variant.set("panel");
		fixture.componentInstance.subheading.set(null);
		fixture.detectChanges();
		const dialog = screen.getByRole("dialog", { name: "Filters" });
		expect(dialog).not.toHaveAttribute("aria-describedby");
	});

	it("keeps one close action working while the variant flips back and forth", async () => {
		const { fixture } = await render(VariantSheetHost);
		const host = fixture.componentInstance;
		for (const variant of ["panel", "menu", "panel", null] as const) {
			host.variant.set(variant);
			fixture.detectChanges();
		}

		expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(
			1
		);
		await userEvent.dblClick(screen.getByRole("button", { name: "Close" }));

		expect(host.closedCount()).toBe(2);
	});
});
