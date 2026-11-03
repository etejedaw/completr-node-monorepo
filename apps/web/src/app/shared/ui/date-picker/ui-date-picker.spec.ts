import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { form, FormField, required } from "@angular/forms/signals";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { UiDatePicker } from "./ui-date-picker";

@Component({
	imports: [UiDatePicker],
	template: `<ui-date-picker
		label="Started"
		triggerId="started"
		[mode]="mode()"
		[minDate]="min()"
		[maxDate]="max()"
		[clearable]="clearable()"
		[invalid]="invalid()"
		[describedBy]="describedBy()"
		[(value)]="value"
		(valueChange)="changes.push($event)"
		(touch)="touches = touches + 1"
	/>`
})
class Host {
	readonly mode = signal<"date" | "datetime">("date");
	readonly value = signal("");
	readonly min = signal<string | null>(null);
	readonly max = signal<string | null>(null);
	readonly clearable = signal(false);
	readonly invalid = signal(false);
	readonly describedBy = signal<string | null>(null);
	readonly changes: string[] = [];
	touches = 0;
}

@Component({
	imports: [UiDatePicker, FormField],
	template: `<ui-date-picker
			label="Acquired"
			[formField]="form.acquiredAt"
			describedBy="acquired-error"
		/>
		<p>Touched: {{ form.acquiredAt().touched() }}</p>`
})
class FormHost {
	readonly model = signal({ acquiredAt: "2026-10-20" });
	readonly form = form(this.model, path => {
		required(path.acquiredAt, { message: "Pick a date" });
	});
}

describe("UiDatePicker", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function renderPicker(
		setup: Partial<{
			mode: "date" | "datetime";
			value: string;
			min: string | null;
			max: string | null;
			clearable: boolean;
			invalid: boolean;
			describedBy: string | null;
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
		if (setup.mode) host.mode.set(setup.mode);
		if (setup.value !== undefined) host.value.set(setup.value);
		if (setup.min !== undefined) host.min.set(setup.min);
		if (setup.max !== undefined) host.max.set(setup.max);
		if (setup.clearable) host.clearable.set(true);
		if (setup.invalid) host.invalid.set(true);
		if (setup.describedBy !== undefined)
			host.describedBy.set(setup.describedBy);
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
		return screen.getByRole("button", { name: /^Started:/ });
	}

	function calendar() {
		return screen.getByRole("grid");
	}

	function day(name: string) {
		return within(calendar()).getByRole("button", { name });
	}

	describe("trigger", () => {
		it("shows the placeholder when there is no value", async () => {
			await renderPicker();

			expect(trigger()).toHaveAccessibleName("Started: Select date");
			expect(trigger()).toHaveAttribute("id", "started");
		});

		it("formats the date in English", async () => {
			await renderPicker({ value: "2026-11-03" });

			expect(trigger()).toHaveAccessibleName("Started: Nov 3, 2026");
			expect(trigger()).toHaveTextContent("Nov 3, 2026");
		});

		it("formats date and time with a 24-hour clock", async () => {
			await renderPicker({ mode: "datetime", value: "2026-11-03T14:05" });

			expect(trigger()).toHaveAccessibleName(
				"Started: Nov 3, 2026, 14:05"
			);
		});

		it.each(["not-a-date", "2026-02-31", "2026-13-01", "03/11/2026"])(
			"treats the garbage value %s as empty",
			async value => {
				await renderPicker({ value });

				expect(trigger()).toHaveAccessibleName("Started: Select date");
			}
		);

		it("marks the trigger invalid and links the error", async () => {
			await renderPicker({ invalid: true, describedBy: "started-error" });

			expect(trigger()).toHaveAttribute("aria-invalid", "true");
			expect(trigger()).toHaveAttribute(
				"aria-describedby",
				"started-error"
			);
		});

		it("is not invalid by default", async () => {
			await renderPicker();

			expect(trigger()).not.toHaveAttribute("aria-invalid");
			expect(trigger()).not.toHaveAttribute("aria-describedby");
		});
	});

	describe("calendar popover", () => {
		it("opens on the selected month and focuses the selected day", async () => {
			const { open } = await renderPicker({ value: "2026-08-15" });

			await open();

			expect(screen.getByText("August 2026")).toBeInTheDocument();
			expect(day("Saturday, August 15, 2026")).toHaveFocus();
			expect(
				day("Saturday, August 15, 2026").closest("td")
			).toHaveAttribute("aria-selected", "true");
		});

		it("opens on today when empty and marks it", async () => {
			const { open } = await renderPicker();

			await open();

			expect(day("Tuesday, November 3, 2026, today")).toHaveFocus();
		});

		it("picks a day, closes and returns focus to the trigger", async () => {
			const { open, user, host } = await renderPicker();

			await open();
			await user.click(day("Thursday, November 12, 2026"));

			expect(host.value()).toBe("2026-11-12");
			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
			expect(trigger()).toHaveFocus();
			expect(trigger()).toHaveAccessibleName("Started: Nov 12, 2026");
		});

		it("survives a double click on a day", async () => {
			const { open, user, host } = await renderPicker();

			await open();
			await user.dblClick(day("Thursday, November 12, 2026"));

			expect(host.value()).toBe("2026-11-12");
			expect(host.changes).toEqual(["2026-11-12"]);
			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
		});

		it("moves with the arrow keys and picks with Enter", async () => {
			const { open, user, host } = await renderPicker({
				value: "2026-11-03"
			});

			await open();
			await user.keyboard("{ArrowRight}{ArrowDown}");
			expect(day("Wednesday, November 11, 2026")).toHaveFocus();
			await user.keyboard("{ArrowLeft}{ArrowUp}");
			expect(day("Tuesday, November 3, 2026, today")).toHaveFocus();
			await user.keyboard("{ArrowRight}{Enter}");

			expect(host.value()).toBe("2026-11-04");
			expect(trigger()).toHaveFocus();
		});

		it("changes month with PageUp and PageDown", async () => {
			const { open, user, fixture } = await renderPicker({
				value: "2026-01-31"
			});

			await open();
			await user.keyboard("{PageDown}");
			await fixture.whenStable();

			expect(screen.getByText("February 2026")).toBeInTheDocument();
			expect(day("Saturday, February 28, 2026")).toHaveFocus();

			await user.keyboard("{PageUp}{PageUp}");
			await fixture.whenStable();

			expect(screen.getByText("December 2025")).toBeInTheDocument();
		});

		it("changes month with the arrow buttons", async () => {
			const { open, user } = await renderPicker({ value: "2026-11-03" });

			await open();
			await user.click(
				screen.getByRole("button", { name: "Next month" })
			);
			expect(screen.getByText("December 2026")).toBeInTheDocument();
			await user.click(
				screen.getByRole("button", { name: "Previous month" })
			);
			await user.click(
				screen.getByRole("button", { name: "Previous month" })
			);
			expect(screen.getByText("October 2026")).toBeInTheDocument();
		});

		it("closes with Escape without changing the value", async () => {
			const { open, user, host } = await renderPicker({
				value: "2026-11-03"
			});

			await open();
			await user.keyboard("{ArrowRight}{Escape}");

			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
			expect(host.value()).toBe("2026-11-03");
			expect(trigger()).toHaveFocus();
			expect(host.touches).toBe(1);
		});

		it("can be opened and closed repeatedly without picking", async () => {
			const { open, user, host } = await renderPicker({
				value: "2026-11-03"
			});

			await open();
			await user.keyboard("{Escape}");
			await open();
			await user.keyboard("{PageDown}{Escape}");
			await open();

			expect(screen.getByText("November 2026")).toBeInTheDocument();
			expect(host.changes).toEqual([]);
		});

		it("picks today from the footer", async () => {
			const { open, user, host } = await renderPicker({
				value: "2026-01-01"
			});

			await open();
			await user.click(screen.getByRole("button", { name: "Today" }));

			expect(host.value()).toBe("2026-11-03");
		});
	});

	describe("min and max", () => {
		it("disables days outside the range", async () => {
			const { open, user, host } = await renderPicker({
				min: "2026-11-05",
				max: "2026-11-20"
			});

			await open();

			expect(day("Wednesday, November 4, 2026")).toBeDisabled();
			expect(day("Saturday, November 21, 2026")).toBeDisabled();
			expect(day("Thursday, November 5, 2026")).toBeEnabled();
			await user.click(day("Wednesday, November 4, 2026"));
			await user.click(day("Saturday, November 21, 2026"));
			expect(host.value()).toBe("");
			expect(screen.getByRole("grid")).toBeInTheDocument();
		});

		it("opens on the first allowed day when today is out of range", async () => {
			const { open } = await renderPicker({ min: "2027-03-10" });

			await open();

			expect(screen.getByText("March 2027")).toBeInTheDocument();
			expect(day("Wednesday, March 10, 2027")).toHaveFocus();
			expect(
				screen.getByRole("button", { name: "Today" })
			).toBeDisabled();
		});

		it("keeps an out-of-range value visible", async () => {
			const { open, host } = await renderPicker({
				value: "2026-11-01",
				min: "2026-11-05"
			});

			await open();

			expect(trigger()).toHaveTextContent("Nov 1, 2026");
			expect(host.value()).toBe("2026-11-01");
		});

		it("clamps the time to the minimum in datetime mode", async () => {
			const { open, user, host } = await renderPicker({
				mode: "datetime",
				min: "2026-11-03T14:30"
			});

			await open();
			await user.click(day("Tuesday, November 3, 2026, today"));

			expect(host.value()).toBe("2026-11-03T14:30");
		});
	});

	describe("clear", () => {
		it("clears an optional value", async () => {
			const { user, host } = await renderPicker({
				value: "2026-11-03",
				clearable: true
			});

			await user.click(
				screen.getByRole("button", { name: "Clear Started" })
			);

			expect(host.value()).toBe("");
			expect(trigger()).toHaveAccessibleName("Started: Select date");
			expect(
				screen.queryByRole("button", { name: "Clear Started" })
			).not.toBeInTheDocument();
		});

		it("clears from the calendar footer", async () => {
			const { open, user, host } = await renderPicker({
				value: "2026-11-03",
				clearable: true
			});

			await open();
			await user.click(screen.getByRole("button", { name: "Clear" }));

			expect(host.value()).toBe("");
			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
		});

		it("has no clear button when the field is required", async () => {
			await renderPicker({ value: "2026-11-03" });

			expect(
				screen.queryByRole("button", { name: "Clear Started" })
			).not.toBeInTheDocument();
		});
	});

	describe("time", () => {
		it("keeps the time when another day is picked", async () => {
			const { open, user, host } = await renderPicker({
				mode: "datetime",
				value: "2026-11-03T14:05"
			});

			await open();
			await user.click(day("Friday, November 6, 2026"));

			expect(host.value()).toBe("2026-11-06T14:05");
			expect(screen.getByRole("grid")).toBeInTheDocument();
		});

		it("steps hours and snaps minutes to five", async () => {
			const { open, user, host } = await renderPicker({
				mode: "datetime",
				value: "2026-11-03T23:07"
			});

			await open();
			await user.click(
				screen.getByRole("button", { name: "Later hour" })
			);
			expect(host.value()).toBe("2026-11-03T00:07");
			await user.click(
				screen.getByRole("button", { name: "Later minutes" })
			);
			expect(host.value()).toBe("2026-11-03T00:10");
			await user.click(
				screen.getByRole("button", { name: "Earlier minutes" })
			);
			await user.click(
				screen.getByRole("button", { name: "Earlier minutes" })
			);
			expect(host.value()).toBe("2026-11-03T00:00");
			await user.click(
				screen.getByRole("button", { name: "Earlier minutes" })
			);
			expect(host.value()).toBe("2026-11-03T00:55");
		});

		it("supports the keyboard on the time spinbuttons", async () => {
			const { open, user, host } = await renderPicker({
				mode: "datetime",
				value: "2026-11-03T10:00"
			});

			await open();
			const hour = screen.getByRole("spinbutton", { name: "Hour" });
			hour.focus();
			await user.keyboard("{ArrowUp}{ArrowUp}{PageUp}");
			expect(hour).toHaveAttribute("aria-valuenow", "18");
			await user.keyboard("{End}");
			expect(host.value()).toBe("2026-11-03T23:00");
			const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
			minutes.focus();
			await user.keyboard("{ArrowDown}{PageDown}{x}");
			expect(host.value()).toBe("2026-11-03T23:49");
			await user.keyboard("{Home}");
			expect(minutes).toHaveAttribute("aria-valuetext", "00");
		});

		it("keeps the time as a draft until a day is picked", async () => {
			const { open, user, host } = await renderPicker({
				mode: "datetime"
			});

			await open();
			await user.click(
				screen.getByRole("button", { name: "Later hour" })
			);
			expect(host.value()).toBe("");
			await user.click(day("Friday, November 6, 2026"));

			expect(host.value()).toBe("2026-11-06T01:00");
		});

		it("closes with Done", async () => {
			const { open, user } = await renderPicker({
				mode: "datetime",
				value: "2026-11-03T10:00"
			});

			await open();
			await user.click(screen.getByRole("button", { name: "Done" }));

			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
			expect(trigger()).toHaveFocus();
		});
	});

	describe("on mobile", () => {
		it("opens the calendar in a bottom sheet", async () => {
			const { user, host } = await renderPicker({ mobile: true });

			await user.click(trigger());

			const sheet = screen.getByRole("dialog", { name: "Started" });
			await user.click(
				within(sheet).getByRole("button", {
					name: "Thursday, November 12, 2026"
				})
			);

			expect(host.value()).toBe("2026-11-12");
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("closes the sheet with Escape and keeps the value", async () => {
			const { user, host, fixture } = await renderPicker({
				mobile: true,
				value: "2026-11-03"
			});

			await user.click(trigger());
			await fixture.whenStable();
			expect(
				screen.getByRole("button", {
					name: "Tuesday, November 3, 2026, today"
				})
			).toHaveFocus();
			await user.keyboard("{ArrowRight}{Escape}");

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(host.value()).toBe("2026-11-03");
			expect(host.touches).toBe(1);
		});
	});

	describe("with signal forms", () => {
		it("reads and writes the bound field", async () => {
			const result = await render(FormHost, {
				providers: [
					{
						provide: ViewportService,
						useValue: { isMobile: signal(false) }
					}
				]
			});
			const user = userEvent.setup();
			const field = screen.getByRole("button", { name: /^Acquired:/ });

			expect(field).toHaveAccessibleName("Acquired: Oct 20, 2026");
			expect(screen.getByText("Touched: false")).toBeInTheDocument();

			await user.click(field);
			await result.fixture.whenStable();
			await user.click(
				screen.getByRole("button", {
					name: "Thursday, October 22, 2026"
				})
			);

			expect(result.fixture.componentInstance.model().acquiredAt).toBe(
				"2026-10-22"
			);
			expect(screen.getByText("Touched: true")).toBeInTheDocument();
		});
	});
});
