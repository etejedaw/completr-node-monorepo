import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ExportPlatformSearchQuery } from "../common/schemas/export-platform-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { type ExportFormat } from "../common/types/export-format.types";
import { sendExport } from "../common/utils/send-export.util";
import { type User } from "../users/user.model";
import { type BulkDeletePlatinumsDto } from "./dtos/bulk-delete-platinums.dto";
import { type UpsertGamePlatinumDto } from "./dtos/upsert-game-platinum.dto";
import {
	PLATINUMS_EXPORT_COLUMNS,
	platinumToExportRow
} from "./game-platinum.export-row.mapper";
import {
	gamePlatinumSerializer,
	platinumEntrySerializer
} from "./game-platinum.serializer";
import * as gamePlatinumService from "./game-platinum.service";
import { type GamePlatinumParams } from "./schemas/game-platinum-params.schema";
import { type PlatinumsBulkQuery } from "./schemas/platinums-bulk-query.schema";

export async function putPlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;
	const body = request.locals.body as UpsertGamePlatinumDto;

	const { platinum, created } = await gamePlatinumService.upsertPlatinum(
		user.id,
		params.gameId,
		body
	);
	if (created)
		activityService.record(user.id, "game_platinumed", params.gameId);

	const data = { platinum: gamePlatinumSerializer(platinum) };
	return response.status(created ? 201 : 200).json({ data });
}

export async function getMyPlatinums(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = (request.locals.query ?? {}) as PaginatedSearchQuery;

	const { rows, total } =
		await gamePlatinumService.findPlatinumsByUserIdPaginated(
			user.id,
			query
		);

	const data = {
		platinums: rows.map(platinum =>
			platinumEntrySerializer(platinum, true)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function deletePlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;

	await gamePlatinumService.removePlatinum(user.id, params.gameId);
	return response.sendStatus(204);
}

export async function getUserPlatinums(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as PaginatedSearchQuery;

	const user = request.locals.profileOwner as User;

	const currentUser = request.locals.user as RequestUser | undefined;

	const isOwner = currentUser?.id === user.id;
	const { rows, total } =
		await gamePlatinumService.findPlatinumsByUserIdPaginated(
			user.id,
			query
		);

	const data = {
		platinums: rows.map(platinum =>
			platinumEntrySerializer(platinum, isOwner)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getMyPlatinumsExport(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const format = request.locals.exportFormat as ExportFormat;
	const query = request.locals.query as ExportPlatformSearchQuery;

	const entries = await gamePlatinumService.findPlatinumsForExport(
		user.id,
		query
	);

	return sendExport(response, {
		resource: "platinums",
		format,
		columns: PLATINUMS_EXPORT_COLUMNS,
		rows: entries.map(entry =>
			platinumToExportRow(entry.get({ plain: true }))
		)
	});
}

export async function postPlatinumsBulk(request: Request, response: Response) {
	const query = request.locals.query as PlatinumsBulkQuery;
	const body = request.locals.body as BulkDeletePlatinumsDto;
	const user = request.locals.user as RequestUser;

	const result = await gamePlatinumService.bulkDeletePlatinums(
		user.id,
		body.gameIds
	);

	const data = { action: query.action, ...result };
	return response.status(200).json({ data });
}
