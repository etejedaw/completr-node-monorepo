import { literal, type Order, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { DataRequest } from "../data-request.model";
import {
	type DataRequestStatus,
	type DataRequestType
} from "../data-requests.constants";
import { type DataRequestResolution } from "../data-requests.interface";
import * as dataRequestsServiceError from "../errors/data-requests.service-error";
import { type AdminDataRequestsQuery } from "../schemas/admin-data-requests-query.schema";

const DEFAULT_ADMIN_PAGE_SIZE = 50;

const PENDING_BY_DEADLINE_THEN_NEWEST: Order = [
	[literal(`"DataRequest"."status" = 'pending'`), "DESC"],
	[
		literal(
			`CASE WHEN "DataRequest"."status" = 'pending' THEN "DataRequest"."requestedAt" END`
		),
		"ASC"
	],
	["requestedAt", "DESC"],
	["id", "DESC"]
];

export async function createDataRequest(userId: string, type: DataRequestType) {
	try {
		return await DataRequest.create({ userId, type });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: dataRequestsServiceError.alreadyPendingError,
			validation: dataRequestsServiceError.validationError
		});
	}
}

export async function findDataRequestsByUserId(userId: string) {
	return DataRequest.findAll({
		where: { userId },
		order: [
			["requestedAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function findOwnDataRequest(userId: string, requestId: string) {
	const request = await DataRequest.findOne({
		where: { id: requestId, userId }
	});
	if (!request) throw dataRequestsServiceError.notFoundError();
	return request;
}

export async function findPendingDataRequest(requestId: string) {
	const request = await DataRequest.findByPk(requestId);
	if (!request) throw dataRequestsServiceError.notFoundError();
	if (request.status !== "pending")
		throw dataRequestsServiceError.notPendingError();
	return request;
}

export async function findDataRequestsForAdmin(query: AdminDataRequestsQuery) {
	const where: { status?: DataRequestStatus; type?: DataRequestType } = {};
	if (query.status) where.status = query.status;
	if (query.type) where.type = query.type;

	const { rows, count } = await DataRequest.findAndCountAll({
		where,
		order: PENDING_BY_DEADLINE_THEN_NEWEST,
		limit: query.limit ?? DEFAULT_ADMIN_PAGE_SIZE,
		offset: query.offset ?? 0
	});
	return { rows, total: count };
}

export async function resolveDataRequest(
	requestId: string,
	resolution: DataRequestResolution,
	transaction?: Transaction
) {
	const [updatedCount, updatedRows] = await DataRequest.update(
		{
			status: resolution.status,
			resolutionNote: resolution.note ?? null,
			resolvedById: resolution.resolvedById,
			resolvedAt: new Date()
		},
		{
			where: { id: requestId, status: "pending" },
			returning: true,
			transaction
		}
	);
	if (updatedCount === 0) throw dataRequestsServiceError.notPendingError();
	return updatedRows[0]!;
}
