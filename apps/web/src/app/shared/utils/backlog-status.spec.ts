import {
	BACKLOG_STATUS_FILTERS,
	BACKLOG_STATUS_ORDER,
	BACKLOG_STATUS_PICKER_OPTIONS,
	backlogStatusCalendarBarClass,
	backlogStatusClass,
	backlogStatusFillClass,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "./backlog-status";

describe("backlog status helpers", () => {
	it.each([
		["not_started", "Not Started"],
		["playing", "Playing"],
		["completed", "Completed"],
		["abandoned", "Abandoned"],
		["endless", "Endless"]
	])("labels %s as %s", (status, label) => {
		expect(backlogStatusLabel(status)).toBe(label);
	});

	it("returns the raw value as label for an unknown status", () => {
		expect(backlogStatusLabel("mystery")).toBe("mystery");
	});

	it("falls back to neutral values for an unknown status", () => {
		expect(backlogStatusClass("mystery")).toBe("");
		expect(backlogStatusIcon("mystery")).toBe("schedule");
		expect(backlogStatusIconColor("mystery")).toBe("");
		expect(backlogStatusFillClass("mystery")).toBe("bg-fg-muted");
		expect(backlogStatusCalendarBarClass("mystery")).toBe("");
	});

	it("gives every known status distinct classes, icon and fill", () => {
		const statuses = [...BACKLOG_STATUS_ORDER];

		for (const fn of [
			backlogStatusClass,
			backlogStatusIcon,
			backlogStatusIconColor,
			backlogStatusFillClass,
			backlogStatusCalendarBarClass
		]) {
			const values = statuses.map(fn);
			expect(values.every(Boolean)).toBe(true);
			expect(new Set(values).size).toBe(statuses.length);
		}
	});

	it("keeps the display order with completed before abandoned", () => {
		expect(BACKLOG_STATUS_ORDER).toEqual([
			"not_started",
			"playing",
			"completed",
			"endless",
			"abandoned"
		]);
	});

	it("builds the filters from the order with their labels", () => {
		expect(BACKLOG_STATUS_FILTERS.map(f => f.value)).toEqual([
			...BACKLOG_STATUS_ORDER
		]);
		expect(BACKLOG_STATUS_FILTERS[0]).toEqual({
			value: "not_started",
			label: "Not Started"
		});
	});

	it("starts the picker options with an All games entry that has an empty value", () => {
		expect(BACKLOG_STATUS_PICKER_OPTIONS[0]).toEqual({
			value: "",
			label: "All games",
			icon: "apps"
		});
		expect(BACKLOG_STATUS_PICKER_OPTIONS).toHaveLength(
			BACKLOG_STATUS_ORDER.length + 1
		);
		expect(BACKLOG_STATUS_PICKER_OPTIONS[3]).toMatchObject({
			value: "completed",
			icon: "check_circle",
			iconClass: "text-success"
		});
	});
});
