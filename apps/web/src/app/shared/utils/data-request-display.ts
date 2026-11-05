import {
	type DataRequest,
	type DataRequestStatus,
	type DataRequestType
} from "../../core/models";
import {
	type DataRequestBadge,
	type DataRequestTypeDisplay
} from "./data-request-display.model";

const URGENT_DAYS_REMAINING = 7;

const TYPE_DISPLAY: Record<DataRequestType, DataRequestTypeDisplay> = {
	export: { label: "Copy of data", icon: "download" },
	deletion: { label: "Account deletion", icon: "delete_forever" }
};

const STATUS_BADGE: Record<DataRequestStatus, DataRequestBadge> = {
	pending: { label: "Pending", tone: "info", icon: "schedule" },
	completed: { label: "Completed", tone: "success", icon: "check_circle" },
	rejected: { label: "Rejected", tone: "danger", icon: "block" }
};

export function dataRequestTypeDisplay(
	type: DataRequestType
): DataRequestTypeDisplay {
	return TYPE_DISPLAY[type];
}

export function dataRequestStatusBadge(
	status: DataRequestStatus
): DataRequestBadge {
	return STATUS_BADGE[status];
}

export function daysRemainingBadge(daysRemaining: number): DataRequestBadge {
	if (daysRemaining < 0) {
		const overdue = Math.abs(daysRemaining);
		return {
			label: `Overdue by ${overdue} ${overdue === 1 ? "day" : "days"}`,
			tone: "danger",
			icon: "error"
		};
	}
	if (daysRemaining === 0)
		return { label: "Due today", tone: "danger", icon: "alarm" };
	return {
		label: `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`,
		tone: daysRemaining <= URGENT_DAYS_REMAINING ? "warning" : "neutral",
		icon: "hourglass_bottom"
	};
}

export function isDownloadable(request: DataRequest, now: Date): boolean {
	return (
		request.type === "export" &&
		request.status === "completed" &&
		request.downloadableUntil !== null &&
		new Date(request.downloadableUntil).getTime() > now.getTime()
	);
}

export function isDownloadExpired(request: DataRequest, now: Date): boolean {
	return (
		request.type === "export" &&
		request.status === "completed" &&
		!isDownloadable(request, now)
	);
}
