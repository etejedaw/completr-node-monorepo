import { type BacklogStatus } from "../../../../core/models";

export interface BulkStatusChange {
	status: BacklogStatus;
	date: string;
}
