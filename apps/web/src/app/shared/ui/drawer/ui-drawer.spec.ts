import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UiTone } from "../tone/ui-tone";
import { UiDrawer } from "./ui-drawer";

@Component({
	imports: [UiDrawer],
	template: `
		<ui-drawer
			eyebrow="My Games"
			heading="Filters"
			[subheading]="subheading()"
			[icon]="icon()"
			[tone]="tone()"
			(closed)="closedCount.set(closedCount() + 1)"
		>
			<p>Body</p>
		</ui-drawer>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class DrawerHost {
	readonly subheading = signal<string | null>("2 active");
	readonly icon = signal<string | null>(null);
	readonly tone = signal<UiTone>("brand");
	readonly closedCount = signal(0);
}

describe("UiDrawer header", () => {
	const drawer = () => screen.getByRole("dialog", { name: "Filters" });
	const header = () => drawer().querySelector("header") as HTMLElement;

	it("uses the dialog header: tone halo, separator and display title", async () => {
		await render(DrawerHost);

		expect(header().className).toContain("radial-gradient");
		expect(header().classList).toContain("border-b");
		expect(header().style.getPropertyValue("--dialog-tone")).toBe(
			"var(--color-brand)"
		);
		const title = screen.getByRole("heading", { name: "Filters" });
		expect(title.classList).toContain("text-xl");
		expect(title.classList).toContain("md:text-2xl");
		expect(screen.getByText("My Games")).toBeInTheDocument();
	});

	it("renders the optional icon hidden from assistive technologies in the tone colors", async () => {
		const { fixture } = await render(DrawerHost);
		expect(header().querySelector(".rounded-xl")).toBeNull();

		fixture.componentInstance.icon.set("tune");
		fixture.componentInstance.tone.set("danger");
		fixture.detectChanges();

		const icon = header().querySelector('[aria-hidden="true"].rounded-xl')!;
		expect(icon.textContent?.trim()).toBe("tune");
		expect(icon.classList).toContain("text-danger");
		expect(header().style.getPropertyValue("--dialog-tone")).toBe(
			"var(--color-danger)"
		);
		expect(drawer()).toHaveAccessibleName("Filters");
	});

	it("describes the drawer by its subheading only while there is one", async () => {
		const { fixture } = await render(DrawerHost);
		expect(drawer()).toHaveAccessibleDescription("2 active");

		fixture.componentInstance.subheading.set(null);
		fixture.detectChanges();

		expect(drawer()).not.toHaveAttribute("aria-describedby");
	});

	it("emits closed for each press of close and for Escape", async () => {
		const { fixture } = await render(DrawerHost);

		await userEvent.dblClick(
			screen.getByRole("button", { name: "Close Filters" })
		);
		drawer().focus();
		await userEvent.keyboard("{Escape}");

		expect(fixture.componentInstance.closedCount()).toBe(3);
	});
});
