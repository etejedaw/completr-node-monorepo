import { type BacklogStatus } from "../../core/models";
import { type PickerOption } from "../components/option-picker/option-picker.model";

const STATUS_CLASSES: Record<BacklogStatus, string> = {
	not_started: "bg-fg-muted/10 text-fg-muted",
	playing: "bg-playing/10 text-playing",
	completed: "bg-success/10 text-success",
	abandoned: "bg-danger/10 text-danger",
	endless: "bg-brand-subtle text-brand"
};

const STATUS_LABELS: Record<BacklogStatus, string> = {
	not_started: "Not Started",
	playing: "Playing",
	completed: "Completed",
	abandoned: "Abandoned",
	endless: "Endless"
};

const STATUS_ICONS: Record<BacklogStatus, string> = {
	not_started: "schedule",
	playing: "play_circle",
	completed: "check_circle",
	abandoned: "cancel",
	endless: "all_inclusive"
};

const STATUS_ICON_COLORS: Record<BacklogStatus, string> = {
	not_started: "text-fg-muted",
	playing: "text-playing",
	completed: "text-success",
	abandoned: "text-danger",
	endless: "text-brand"
};

const STATUS_FILL_CLASSES: Record<BacklogStatus, string> = {
	not_started: "bg-fg-muted",
	playing: "bg-playing",
	completed: "bg-success",
	abandoned: "bg-danger",
	endless: "bg-brand"
};

const STATUS_CALENDAR_BAR_CLASSES: Record<BacklogStatus, string> = {
	not_started: "bg-fg-muted/15 text-fg-secondary",
	playing: "bg-playing/25 text-playing",
	completed: "bg-success/25 text-success",
	abandoned: "bg-danger/25 text-danger",
	endless: "bg-brand-subtle text-brand"
};

export function backlogStatusCalendarBarClass(
	status: BacklogStatus | string
): string {
	return STATUS_CALENDAR_BAR_CLASSES[status as BacklogStatus] ?? "";
}

export function backlogStatusFillClass(status: BacklogStatus | string): string {
	return STATUS_FILL_CLASSES[status as BacklogStatus] ?? "bg-fg-muted";
}

export function backlogStatusClass(status: BacklogStatus | string): string {
	return STATUS_CLASSES[status as BacklogStatus] ?? "";
}

export function backlogStatusLabel(status: BacklogStatus | string): string {
	return STATUS_LABELS[status as BacklogStatus] ?? status;
}

export function backlogStatusIcon(status: BacklogStatus | string): string {
	return STATUS_ICONS[status as BacklogStatus] ?? "schedule";
}

export function backlogStatusIconColor(status: BacklogStatus | string): string {
	return STATUS_ICON_COLORS[status as BacklogStatus] ?? "";
}

export const BACKLOG_STATUS_ORDER: readonly BacklogStatus[] = [
	"not_started",
	"playing",
	"completed",
	"endless",
	"abandoned"
];

export const BACKLOG_STATUS_FILTERS: readonly {
	label: string;
	value: BacklogStatus;
}[] = BACKLOG_STATUS_ORDER.map(value => ({
	value,
	label: STATUS_LABELS[value]
}));

export const BACKLOG_STATUS_PICKER_OPTIONS: readonly PickerOption[] = [
	{ value: "", label: "All games", icon: "apps" },
	...BACKLOG_STATUS_FILTERS.map(filter => ({
		value: filter.value,
		label: filter.label,
		icon: backlogStatusIcon(filter.value),
		iconClass: backlogStatusIconColor(filter.value)
	}))
];
