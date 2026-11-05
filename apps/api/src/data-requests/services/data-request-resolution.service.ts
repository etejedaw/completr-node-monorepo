import * as auditService from "../../audit/audit.service";
import * as usersService from "../../users/users.service";
import * as usersDeletionService from "../../users/users-deletion.service";
import { type DataRequest } from "../data-request.model";
import { type DataRequestResolution } from "../data-requests.interface";
import * as dataRequestMailService from "./data-request-mail.service";
import * as dataRequestsService from "./data-requests.service";

async function findRequester(request: DataRequest) {
	if (!request.userId) return null;
	return usersService.findUserByIdUnfiltered(request.userId);
}

function recordResolution(adminId: string, request: DataRequest) {
	auditService.record(
		adminId,
		`data_request_${request.status}`,
		"data_request",
		request.id
	);
}

async function resolveAndNotify(
	request: DataRequest,
	resolution: DataRequestResolution
) {
	const resolved = await dataRequestsService.resolveDataRequest(
		request.id,
		resolution
	);
	const requester = await findRequester(resolved);
	if (requester)
		await dataRequestMailService.notifyRequesterOfResolution(
			resolved,
			requester
		);
	recordResolution(resolution.resolvedById, resolved);
	return resolved;
}

async function completeDeletion(request: DataRequest, adminId: string) {
	const completion: DataRequestResolution = {
		status: "completed",
		resolvedById: adminId
	};
	if (!request.userId) return resolveAndNotify(request, completion);

	const requester = await usersDeletionService.findDeletableUser(
		request.userId,
		adminId
	);
	await dataRequestMailService.notifyRequesterOfResolution(
		{
			...request.get({ plain: true }),
			status: "completed",
			resolvedAt: new Date()
		},
		requester
	);
	const resolved = await usersDeletionService.deleteAccount(
		requester,
		adminId,
		transaction =>
			dataRequestsService.resolveDataRequest(
				request.id,
				completion,
				transaction
			)
	);
	recordResolution(adminId, resolved);
	return resolved;
}

export async function completeDataRequest(requestId: string, adminId: string) {
	const request = await dataRequestsService.findPendingDataRequest(requestId);
	if (request.type === "deletion") return completeDeletion(request, adminId);
	return resolveAndNotify(request, {
		status: "completed",
		resolvedById: adminId
	});
}

export async function rejectDataRequest(
	requestId: string,
	adminId: string,
	reason: string
) {
	const request = await dataRequestsService.findPendingDataRequest(requestId);
	return resolveAndNotify(request, {
		status: "rejected",
		resolvedById: adminId,
		note: reason
	});
}
