export const DATA_REQUEST_TYPES = ["export", "deletion"] as const;
export type DataRequestType = (typeof DATA_REQUEST_TYPES)[number];

export const DATA_REQUEST_STATUSES = [
	"pending",
	"completed",
	"rejected"
] as const;
export type DataRequestStatus = (typeof DATA_REQUEST_STATUSES)[number];

export const DATA_REQUEST_RESPONSE_DAYS = 30;
export const DATA_EXPORT_DOWNLOAD_DAYS = 7;
export const REJECTION_REASON_MAX_LENGTH = 500;
