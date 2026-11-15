import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import {
	NgpDatePickerCell,
	NgpDatePickerCellRender,
	NgpDatePickerDateButton,
	NgpDatePickerGrid,
	NgpDatePickerLabel,
	NgpDatePickerNextMonth,
	NgpDatePickerPreviousMonth,
	NgpDatePickerRowRender
} from "ng-primitives/date-picker";

import { UiIconButton } from "../icon-button/ui-icon-button";
import {
	CALENDAR_WEEKDAYS,
	formatCalendarDayLabel,
	formatMonthLabel
} from "./date-picker-value";

let nextCalendarPanelId = 0;

@Component({
	selector: "ui-calendar-panel",
	imports: [
		NgpDatePickerCell,
		NgpDatePickerCellRender,
		NgpDatePickerDateButton,
		NgpDatePickerGrid,
		NgpDatePickerLabel,
		NgpDatePickerNextMonth,
		NgpDatePickerPreviousMonth,
		NgpDatePickerRowRender,
		UiIconButton
	],
	templateUrl: "./ui-calendar-panel.html",
	host: { class: "flex flex-col gap-3" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiCalendarPanel {
	readonly focusedDay = input.required<Date>();

	protected readonly weekdays = CALENDAR_WEEKDAYS;
	protected readonly gridLabelId = `ui-calendar-month-${nextCalendarPanelId++}`;

	protected monthLabel(date: Date) {
		return formatMonthLabel(date);
	}

	protected dayLabel(date: Date) {
		return formatCalendarDayLabel(date);
	}
}
