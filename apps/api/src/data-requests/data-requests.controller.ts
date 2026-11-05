import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/users.service";
import { type DataRequest } from "./data-request.model";
import { type CreateDataRequestDto } from "./dtos/create-data-request.dto";
import * as dataRequestsDomainError from "./errors/data-requests.domain-error";
import { type DataRequestIdParam } from "./schemas/data-request-id-params.schema";
import { dataRequestSerializer } from "./serializers/data-request.serializer";
import * as dataRequestMailService from "./services/data-request-mail.service";
import * as dataRequestsService from "./services/data-requests.service";
import { buildPersonalDataExport } from "./services/personal-data-export.service";
import { exportDownloadableUntil } from "./utils/data-request-deadlines.util";
import { sendPersonalDataExport } from "./utils/send-personal-data-export.util";

function assertDownloadable(request: DataRequest, now = new Date()) {
	const downloadableUntil = exportDownloadableUntil(request);
	if (!downloadableUntil)
		throw dataRequestsDomainError.dataRequestNotDownloadable();
	if (now > downloadableUntil)
		throw dataRequestsDomainError.dataRequestExpired();
}

export async function postDataRequest(request: Request, response: Response) {
	const { type } = request.locals.body as CreateDataRequestDto;
	const requester = request.locals.user as RequestUser;

	const dataRequest = await dataRequestsService.createDataRequest(
		requester.id,
		type
	);
	await dataRequestMailService.notifyAdminOfNewRequest(
		dataRequest,
		requester
	);

	const data = { request: dataRequestSerializer(dataRequest) };
	return response.status(201).json({ data });
}

export async function getDataRequests(request: Request, response: Response) {
	const { id } = request.locals.user as RequestUser;

	const requests = await dataRequestsService.findDataRequestsByUserId(id);

	const data = {
		requests: requests.map(dataRequest =>
			dataRequestSerializer(dataRequest)
		)
	};
	return response.status(200).json({ data });
}

export async function getDataRequestDownload(
	request: Request,
	response: Response
) {
	const { requestId } = request.locals.params as DataRequestIdParam;
	const { id } = request.locals.user as RequestUser;

	const dataRequest = await dataRequestsService.findOwnDataRequest(
		id,
		requestId
	);
	assertDownloadable(dataRequest);

	const user = await usersService.findUserById(id);
	if (!user) throw dataRequestsDomainError.dataRequestNotFound();

	const personalData = await buildPersonalDataExport(user);
	return sendPersonalDataExport(response, user.username, personalData);
}
