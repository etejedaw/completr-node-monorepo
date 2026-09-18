import { BacklogStatus } from "../../core/models";

const STATUS_CLASSES: Record<BacklogStatus, string> = {
	not_started: "bg-fg-muted/10 text-fg-muted",
	playing: "bg-warning/10 text-warning",
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
	playing: "text-warning",
	completed: "text-success",
	abandoned: "text-danger",
	endless: "text-brand"
};

export function backlogStatusClass(status: BacklogStatus): string {
	return STATUS_CLASSES[status] ?? "";
}

export function backlogStatusLabel(status: BacklogStatus): string {
	return STATUS_LABELS[status] ?? status;
}

export function backlogStatusIcon(status: BacklogStatus): string {
	return STATUS_ICONS[status] ?? "schedule";
}

export function backlogStatusIconColor(status: BacklogStatus): string {
	return STATUS_ICON_COLORS[status] ?? "";
}
