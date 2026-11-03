import { screen, within } from "@testing-library/angular";
import { type UserEvent } from "@testing-library/user-event";

import {
	formatDayLabel,
	formatMonthLabel,
	parseDateValue
} from "./date-picker-value";

const MAX_MONTH_STEPS = 600;

function shownMonth(grid: HTMLElement) {
	const headingId = grid.getAttribute("aria-labelledby") ?? "";
	const heading = document.getElementById(headingId)?.textContent ?? "";
	return new Date(Date.parse(`1 ${heading.trim()}`));
}

function monthIndex(date: Date) {
	return date.getFullYear() * 12 + date.getMonth();
}

export async function pickCalendarDate(
	user: Pick<UserEvent, "click">,
	trigger: HTMLElement,
	value: string
) {
	const target = parseDateValue(value, "date");
	if (!target) throw new Error(`Not a calendar day: ${value}`);
	await user.click(trigger);
	const targetHeading = formatMonthLabel(target);
	for (let step = 0; step < MAX_MONTH_STEPS; step++) {
		const grid = await screen.findByRole("grid");
		const distance = monthIndex(target) - monthIndex(shownMonth(grid));
		if (distance === 0) break;
		await user.click(
			screen.getByRole("button", {
				name: distance > 0 ? "Next month" : "Previous month"
			})
		);
	}
	await screen.findByText(targetHeading);
	await user.click(
		within(screen.getByRole("grid")).getByRole("button", {
			name: new RegExp(`^${formatDayLabel(target)}`)
		})
	);
}
