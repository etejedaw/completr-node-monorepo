import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/users.service";
import { type RejectDataRequestDto } from "./dtos/reject-data-request.dto";
import { type AdminDataRequestsQuery } from "./schemas/admin-data-requests-query.schema";
import { type DataRequestIdParam } from "./schemas/data-request-id-params.schema";
import {
	adminDataRequestSerializer,
	dataRequestSerializer
} from "./serializers/data-request.serializer";
import * as dataRequestResolutionService from "./services/data-request-resolution.service";
import * as dataRequestsService from "./services/data-requests.service";

export async function getAdminDataRequests(
	request: Request,
	response: Response
) {
	const query = (request.locals.query ?? {}) as AdminDataRequestsQuery;

	const { rows, total } =
		await dataRequestsService.findDataRequestsForAdmin(query);
	const ownerIds = [
		...new Set(rows.flatMap(row => (row.userId ? [row.userId] : [])))
	];
	const owners = await usersService.findUsersByIds(ownerIds);
	const ownerById = new Map(owners.map(owner => [owner.id, owner]));

	const data = {
		requests: rows.map(row =>
			adminDataRequestSerializer(
				row,
				row.userId ? (ownerById.get(row.userId) ?? null) : null
			)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function postCompleteDataRequest(
	request: Request,
	response: Response
) {
	const { requestId } = request.locals.params as DataRequestIdParam;
	const admin = request.locals.user as RequestUser;

	const completed = await dataRequestResolutionService.completeDataRequest(
		requestId,
		admin.id
	);

	const data = { request: dataRequestSerializer(completed) };
	return response.status(200).json({ data });
}

export async function postRejectDataRequest(
	request: Request,
	response: Response
) {
	const { requestId } = request.locals.params as DataRequestIdParam;
	const { reason } = request.locals.body as RejectDataRequestDto;
	const admin = request.locals.user as RequestUser;

	const rejected = await dataRequestResolutionService.rejectDataRequest(
		requestId,
		admin.id,
		reason
	);

	const data = { request: dataRequestSerializer(rejected) };
	return response.status(200).json({ data });
}
