export type UiDatePickerMode = "date" | "datetime";

// 2026-11-03
const DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 2026-11-03T14:30, with optional seconds and fraction
const DATETIME_VALUE_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

const DISPLAY_LOCALE = "en-US";

const DATE_DISPLAY = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	month: "short",
	day: "numeric",
	year: "numeric"
});

const DATETIME_DISPLAY = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23"
});

const DAY_LABEL = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	weekday: "long",
	month: "long",
	day: "numeric",
	year: "numeric"
});

const MONTH_LABEL = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	month: "long",
	year: "numeric"
});

function padTwo(value: number) {
	return String(value).padStart(2, "0");
}

function buildLocalDate(
	year: number,
	month: number,
	day: number,
	hours = 0,
	minutes = 0
) {
	const date = new Date(year, month - 1, day, hours, minutes);
	const matches =
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day &&
		hours < 24 &&
		minutes < 60;
	return matches ? date : null;
}

export function parseDateValue(
	value: string | null | undefined,
	mode: UiDatePickerMode
): Date | null {
	if (!value) return null;
	if (mode === "date") {
		const parts = DATE_VALUE_PATTERN.exec(value);
		if (!parts) return null;
		return buildLocalDate(+parts[1], +parts[2], +parts[3]);
	}
	const parts = DATETIME_VALUE_PATTERN.exec(value);
	if (!parts) return null;
	return buildLocalDate(
		+parts[1],
		+parts[2],
		+parts[3],
		+parts[4],
		+parts[5]
	);
}

export function formatDateValue(date: Date, mode: UiDatePickerMode) {
	const day = `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
	if (mode === "date") return day;
	return `${day}T${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

export function formatDateDisplay(date: Date, mode: UiDatePickerMode) {
	return (mode === "date" ? DATE_DISPLAY : DATETIME_DISPLAY).format(date);
}

export function formatDayLabel(date: Date) {
	return DAY_LABEL.format(date);
}

export function formatMonthLabel(date: Date) {
	return MONTH_LABEL.format(date);
}

export function formatTwoDigits(value: number) {
	return padTwo(value);
}

export function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function clampDate(date: Date, min: Date | null, max: Date | null) {
	if (min && date < min) return new Date(min);
	if (max && date > max) return new Date(max);
	return date;
}

export function withTime(day: Date, hours: number, minutes: number) {
	return new Date(
		day.getFullYear(),
		day.getMonth(),
		day.getDate(),
		hours,
		minutes
	);
}
