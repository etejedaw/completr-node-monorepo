export type DataRequestType = "export" | "deletion";

export type DataRequestStatus = "pending" | "completed" | "rejected";

export interface DataRequest {
	id: string;
	type: DataRequestType;
	status: DataRequestStatus;
	requestedAt: string;
	resolvedAt: string | null;
	dueAt: string;
	daysRemaining: number;
	downloadableUntil: string | null;
	resolutionNote: string | null;
}
