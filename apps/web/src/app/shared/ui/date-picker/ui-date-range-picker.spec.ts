import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { UiDateRangePicker } from "./ui-date-range-picker";

@Component({
	imports: [UiDateRangePicker],
	template: `<ui-date-range-picker
		label="Period"
		triggerId="period"
		[minDate]="min()"
		[maxDate]="max()"
		[invalid]="invalid()"
		[describedBy]="describedBy()"
		[(start)]="start"
		[(end)]="end"
		(touch)="touches = touches + 1"
	/>`
})
class Host {
	readonly start = signal("");
	readonly end = signal("");
	readonly min = signal<string | null>(null);
	readonly max = signal<string | null>(null);
	readonly invalid = signal(false);
	readonly describedBy = signal<string | null>(null);
	touches = 0;
}

describe("UiDateRangePicker", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function renderPicker(
		setup: Partial<{
			start: string;
			end: string;
			min: string;
			max: string;
			invalid: boolean;
			describedBy: string;
			mobile: boolean;
		}> = {}
	) {
		const result = await render(Host, {
			providers: [
				{
					provide: ViewportService,
					useValue: { isMobile: signal(setup.mobile ?? false) }
				}
			]
		});
		const host = result.fixture.componentInstance;
		if (setup.start) host.start.set(setup.start);
		if (setup.end) host.end.set(setup.end);
		if (setup.min) host.min.set(setup.min);
		if (setup.max) host.max.set(setup.max);
		if (setup.invalid) host.invalid.set(true);
		if (setup.describedBy) host.describedBy.set(setup.describedBy);
		result.fixture.detectChanges();
		const user = userEvent.setup();
		return {
			user,
			host,
			fixture: result.fixture,
			open: async () => {
				await user.click(trigger());
				await result.fixture.whenStable();
			}
		};
	}

	function trigger() {
		return screen.getByRole("button", { name: /^Period:/ });
	}

	function day(name: RegExp) {
		return within(screen.getByRole("grid")).getByRole("button", { name });
	}

	it("shows the placeholder, the id and the invalid state on the trigger", async () => {
		await renderPicker({ invalid: true, describedBy: "period-error" });

		expect(trigger()).toHaveAccessibleName("Period: Select dates");
		expect(trigger()).toHaveAttribute("id", "period");
		expect(trigger()).toHaveAttribute("aria-invalid", "true");
		expect(trigger()).toHaveAttribute("aria-describedby", "period-error");
	});

	it("formats a complete range in English", async () => {
		await renderPicker({ start: "2026-12-01", end: "2027-01-31" });

		expect(trigger()).toHaveAccessibleName(
			"Period: Dec 1, 2026 – Jan 31, 2027"
		);
	});

	it("commits only after the second day and then closes", async () => {
		const { user, host, open } = await renderPicker();
		await open();

		await user.click(day(/^Monday, November 9, 2026/));
		expect(host.start()).toBe("");
		expect(screen.getByText(/Pick the last day/)).toBeInTheDocument();

		await user.click(day(/^Saturday, November 21, 2026/));

		expect(host.start()).toBe("2026-11-09");
		expect(host.end()).toBe("2026-11-21");
		await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
	});

	it("puts the days in order when the second click is earlier than the first", async () => {
		const { user, host, open } = await renderPicker();
		await open();

		await user.click(day(/^Saturday, November 21, 2026/));
		await user.click(day(/^Monday, November 9, 2026/));

		expect(host.start()).toBe("2026-11-09");
		expect(host.end()).toBe("2026-11-21");
	});

	it("accepts a one-day range on a double click", async () => {
		const { user, host, open } = await renderPicker();
		await open();

		await user.dblClick(day(/^Monday, November 9, 2026/));

		expect(host.start()).toBe("2026-11-09");
		expect(host.end()).toBe("2026-11-09");
	});

	it("keeps the previous range when the picker is closed halfway", async () => {
		const { user, host, open, fixture } = await renderPicker({
			start: "2026-11-02",
			end: "2026-11-04"
		});
		await open();

		await user.click(day(/^Monday, November 16, 2026/));
		await user.keyboard("{Escape}");
		await fixture.whenStable();

		expect(host.start()).toBe("2026-11-02");
		expect(host.end()).toBe("2026-11-04");
		expect(host.touches).toBeGreaterThan(0);

		await open();
		expect(
			within(screen.getByRole("dialog")).getByText(
				"Nov 2, 2026 – Nov 4, 2026"
			)
		).toBeInTheDocument();
	});

	it("disables the days outside the bounds", async () => {
		const { open } = await renderPicker({
			min: "2026-11-05",
			max: "2026-11-20"
		});
		await open();

		expect(day(/^Wednesday, November 4, 2026/)).toBeDisabled();
		expect(day(/^Saturday, November 21, 2026/)).toBeDisabled();
		expect(day(/^Thursday, November 5, 2026/)).toBeEnabled();
	});

	it("opens the calendar in a bottom sheet on mobile", async () => {
		const { user, host, open } = await renderPicker({ mobile: true });
		await open();

		const sheet = await screen.findByRole("dialog", { name: "Period" });
		await user.click(
			within(sheet).getByRole("button", {
				name: /^Tuesday, November 10, 2026/
			})
		);
		await user.click(
			within(sheet).getByRole("button", {
				name: /^Thursday, November 12, 2026/
			})
		);

		expect(host.start()).toBe("2026-11-10");
		expect(host.end()).toBe("2026-11-12");
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "Period" })).toBeNull()
		);
	});
});
