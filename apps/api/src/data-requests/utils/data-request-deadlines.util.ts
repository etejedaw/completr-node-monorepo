import {
	DATA_EXPORT_DOWNLOAD_DAYS,
	DATA_REQUEST_RESPONSE_DAYS
} from "../data-requests.constants";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
	return new Date(date.getTime() + days * DAY_MS);
}

export function dataRequestDueAt(requestedAt: Date) {
	return addDays(requestedAt, DATA_REQUEST_RESPONSE_DAYS);
}

export function daysUntil(deadline: Date, now = new Date()) {
	return Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS) || 0;
}

export function exportDownloadableUntil(request: {
	type: string;
	status: string;
	resolvedAt: Date | null;
}) {
	if (request.type !== "export" || request.status !== "completed")
		return null;
	if (!request.resolvedAt) return null;
	return addDays(request.resolvedAt, DATA_EXPORT_DOWNLOAD_DAYS);
}
