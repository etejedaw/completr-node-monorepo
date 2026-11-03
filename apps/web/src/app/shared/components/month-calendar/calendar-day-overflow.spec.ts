import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { CalendarDayOverflow } from "./calendar-day-overflow";

describe("CalendarDayOverflow", () => {
	it("shows how many entries are hidden", async () => {
		await render(CalendarDayOverflow, { inputs: { count: 4 } });

		expect(
			screen.getByRole("button", { name: "+4 more" })
		).toBeInTheDocument();
	});

	it("highlights on hover with the brand tone by default and the platinum tone on request", async () => {
		const { rerender } = await render(CalendarDayOverflow, {
			inputs: { count: 2 }
		});
		const button = screen.getByRole("button");
		expect(button).toHaveClass("hover:text-brand");

		await rerender({ inputs: { count: 2, tone: "platinum" } });
		expect(button).toHaveClass("hover:text-platinum");
		expect(button).not.toHaveClass("hover:text-brand");
	});

	it("emits pressed when clicked", async () => {
		const pressed = vi.fn();
		await render(CalendarDayOverflow, {
			inputs: { count: 1 },
			on: { pressed }
		});

		await userEvent.setup().click(screen.getByRole("button"));

		expect(pressed).toHaveBeenCalledOnce();
	});
});
