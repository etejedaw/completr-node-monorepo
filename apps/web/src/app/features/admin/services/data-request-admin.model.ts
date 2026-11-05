import {
	type DataRequest,
	type DataRequestStatus,
	type DataRequestType
} from "../../../core/models";

export interface DataRequestOwner {
	id: string;
	username: string;
	email: string;
}

export interface AdminDataRequest extends DataRequest {
	user: DataRequestOwner | null;
}

export interface AdminDataRequestPage {
	requests: AdminDataRequest[];
	total: number;
}

export interface AdminDataRequestQuery {
	status?: DataRequestStatus;
	type?: DataRequestType;
	limit: number;
	offset: number;
}
