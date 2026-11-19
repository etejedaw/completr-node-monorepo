import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { AppearancePicker } from "./appearance-picker";

@Component({
	imports: [AppearancePicker],
	template: `<app-appearance-picker
		[defaultIcon]="defaultIcon()"
		[(icon)]="icon"
		[(color)]="color"
	/>`
})
class PickerHost {
	readonly icon = signal<string | null>(null);
	readonly color = signal<string | null>(null);
	readonly defaultIcon = signal<string | null>(null);
}

async function renderPicker(
	initial: {
		icon?: string | null;
		color?: string | null;
		defaultIcon?: string | null;
	} = {}
) {
	const { fixture } = await render(PickerHost);
	const host = fixture.componentInstance;
	host.icon.set(initial.icon ?? null);
	host.color.set(initial.color ?? null);
	host.defaultIcon.set(initial.defaultIcon ?? null);
	fixture.detectChanges();
	await fixture.whenStable();
	return { fixture, host };
}

const iconGroup = () => screen.getByRole("group", { name: /^Icon/ });
const colorGroup = () => screen.getByRole("group", { name: /^Color/ });

describe("AppearancePicker", () => {
	it("marks the current icon and color as pressed", async () => {
		await renderPicker({ icon: "bolt", color: "rose" });

		expect(
			within(iconGroup()).getByRole("button", { name: "Bolt" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(iconGroup()).getByRole("button", { name: "No icon" })
		).toHaveAttribute("aria-pressed", "false");
		expect(
			within(colorGroup()).getByRole("button", { name: "Pink" })
		).toHaveAttribute("aria-pressed", "true");
	});

	it("keeps the last icon and color after rapid changes", async () => {
		const user = userEvent.setup();
		const { host } = await renderPicker();

		for (const name of ["Star", "Fire", "Rocket", "Fire"])
			await user.click(within(iconGroup()).getByRole("button", { name }));
		for (const name of ["Green", "Purple", "Gray"])
			await user.click(
				within(colorGroup()).getByRole("button", { name })
			);

		expect(host.icon()).toBe("local_fire_department");
		expect(host.color()).toBe("slate");
		expect(
			within(iconGroup())
				.getAllByRole("button")
				.filter(
					button => button.getAttribute("aria-pressed") === "true"
				)
		).toHaveLength(1);
	});

	it("clears both choices with the none swatches, even on a double click", async () => {
		const user = userEvent.setup();
		const { host } = await renderPicker({ icon: "bolt", color: "teal" });

		await user.dblClick(
			within(iconGroup()).getByRole("button", { name: "No icon" })
		);
		await user.dblClick(
			within(colorGroup()).getByRole("button", { name: "No color" })
		);

		expect(host.icon()).toBeNull();
		expect(host.color()).toBeNull();
	});

	it("previews the icons in the chosen color", async () => {
		const user = userEvent.setup();
		await renderPicker();

		await user.click(
			within(colorGroup()).getByRole("button", { name: "Sky blue" })
		);

		const glyph = within(iconGroup())
			.getByRole("button", { name: "Trophy" })
			.querySelector(".material-icons") as HTMLElement;
		expect(glyph.style.color).toBe("var(--color-view-sky)");
	});

	it("shows the default icon in the none swatch when there is one", async () => {
		await renderPicker({ defaultIcon: "label", color: "emerald" });

		const none = within(iconGroup()).getByRole("button", {
			name: "Default icon"
		});
		expect(none).toHaveTextContent("label");
		expect(none).toHaveAttribute("aria-pressed", "true");
		expect(
			within(iconGroup()).queryByRole("button", { name: "No icon" })
		).not.toBeInTheDocument();
	});
});
