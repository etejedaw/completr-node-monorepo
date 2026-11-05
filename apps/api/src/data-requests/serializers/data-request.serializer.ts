import { type User } from "../../users/user.model";
import { type DataRequest } from "../data-request.model";
import {
	dataRequestDueAt,
	daysUntil,
	exportDownloadableUntil
} from "../utils/data-request-deadlines.util";

export function dataRequestSerializer(request: DataRequest, now = new Date()) {
	const dueAt = dataRequestDueAt(request.requestedAt);
	return {
		id: request.id,
		type: request.type,
		status: request.status,
		requestedAt: request.requestedAt,
		resolvedAt: request.resolvedAt,
		dueAt,
		daysRemaining: daysUntil(dueAt, now),
		downloadableUntil: exportDownloadableUntil(request),
		resolutionNote: request.resolutionNote
	};
}

export function adminDataRequestSerializer(
	request: DataRequest,
	owner: Pick<User, "id" | "username" | "email"> | null,
	now = new Date()
) {
	return {
		...dataRequestSerializer(request, now),
		user: owner
			? { id: owner.id, username: owner.username, email: owner.email }
			: null
	};
}
