import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { CalendarEventChip } from "./calendar-event-chip";

describe("CalendarEventChip", () => {
	it("shows the title with a tooltip and the given tone", async () => {
		await render(CalendarEventChip, {
			inputs: { title: "Hades", toneClass: "bg-brand-subtle text-brand" }
		});

		const chip = screen.getByRole("button", { name: "Hades" });
		expect(chip).toHaveAttribute("title", "Hades");
		expect(chip).toHaveClass("bg-brand-subtle", "text-brand");
	});

	it("uses the aria label as its accessible name", async () => {
		await render(CalendarEventChip, {
			inputs: { title: "Hades", ariaLabel: "Hades, Completed" }
		});

		expect(
			screen.getByRole("button", { name: "Hades, Completed" })
		).toHaveTextContent("Hades");
	});

	it("rounds both sides by default and only the requested ones otherwise", async () => {
		const { rerender } = await render(CalendarEventChip, {
			inputs: { title: "Hades" }
		});
		const chip = screen.getByRole("button");
		expect(chip).toHaveClass("rounded-l", "rounded-r");

		await rerender({
			inputs: { title: "Hades", roundLeft: false, roundRight: true }
		});
		expect(chip).not.toHaveClass("rounded-l");
		expect(chip).toHaveClass("rounded-r");
	});

	it("hides the title and the tab stop on continuation segments", async () => {
		await render(CalendarEventChip, {
			inputs: {
				title: "Hades",
				ariaLabel: "Hades, Playing",
				showTitle: false
			}
		});

		const chip = screen.getByRole("button", { name: "Hades, Playing" });
		expect(chip).toHaveAttribute("tabindex", "-1");
		expect(chip).not.toHaveTextContent("Hades");
	});

	it("emits pressed when clicked", async () => {
		const pressed = vi.fn();
		await render(CalendarEventChip, {
			inputs: { title: "Hades" },
			on: { pressed }
		});

		await userEvent.setup().click(screen.getByRole("button"));

		expect(pressed).toHaveBeenCalledOnce();
	});
});
