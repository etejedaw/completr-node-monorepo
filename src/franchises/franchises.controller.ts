import { type Request, type Response } from "express";

import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import { gameSerializer } from "../games/games.serializer";
import * as gamesService from "../games/games.service";
import { type RegisterFranchiseDto } from "./dtos/register-franchise.dto";
import { type UpdateFranchiseDto } from "./dtos/update-franchise.dto";
import * as franchiseDomainError from "./errors/franchises.domain-error";
import * as franchiseService from "./franchises.service";
import { type FranchiseCodeParam } from "./schemas/franchise-code-params.schema";
import { type FranchiseIdParam } from "./schemas/franchise-id-params.schema";

const COMPLETED_STATUSES = ["completed", "abandoned", "endless"];

export async function getAllFranchises(request: Request, response: Response) {
	const query = request.locals.query as PaginatedSearchQuery;

	const { rows, total } = await franchiseService.findAllFranchises(query);
	const franchises = rows.map(franchise => franchise.get({ plain: true }));

	const data = { franchises, total };
	return response.status(200).json({ data });
}

export async function getFranchiseByCode(request: Request, response: Response) {
	const { code } = request.locals.params as FranchiseCodeParam;
	const query = request.locals.query as PaginationQuery;
	const viewer = request.locals.user as RequestUser | undefined;

	const franchise = await franchiseService.findFranchiseByCode(code);
	if (!franchise) throw franchiseDomainError.franchiseNotFound();

	const [{ rows, hasMore }, allGameIds] = await Promise.all([
		gamesService.findGamesByFranchiseId(franchise.id, {
			limit: query.limit,
			offset: query.offset
		}),
		gamesService.findGameIdsByFranchiseId(franchise.id)
	]);

	const pageGameIds = rows.map(game => game.id);
	const [completed, statusMap, isTracked] = await Promise.all([
		viewer
			? backlogService.countDistinctGamesByUserStatusAndGameIds(
					viewer.id,
					allGameIds,
					COMPLETED_STATUSES
				)
			: Promise.resolve(0),
		viewer
			? buildStatusMap(viewer.id, pageGameIds)
			: Promise.resolve(new Map<string, string>()),
		viewer
			? franchiseService.isTrackingFranchise(viewer.id, franchise.id)
			: Promise.resolve(false)
	]);

	const games = rows.map(game => ({
		...gameSerializer(game.get({ plain: true })),
		backlogStatus: statusMap.get(game.id) ?? null
	}));

	const data = {
		franchise: franchise.get({ plain: true }),
		games,
		progress: { completed, total: allGameIds.length },
		isTracked,
		hasMore
	};
	return response.status(200).json({ data });
}

export async function postTrackFranchise(request: Request, response: Response) {
	const { code } = request.locals.params as FranchiseCodeParam;
	const viewer = request.locals.user as RequestUser;

	const franchise = await franchiseService.findFranchiseByCode(code);
	if (!franchise) throw franchiseDomainError.franchiseNotFound();

	await franchiseService.trackFranchise(viewer.id, franchise.id);
	return response.sendStatus(204);
}

export async function deleteTrackFranchise(
	request: Request,
	response: Response
) {
	const { code } = request.locals.params as FranchiseCodeParam;
	const viewer = request.locals.user as RequestUser;

	const franchise = await franchiseService.findFranchiseByCode(code);
	if (!franchise) throw franchiseDomainError.franchiseNotFound();

	await franchiseService.untrackFranchise(viewer.id, franchise.id);
	return response.sendStatus(204);
}

async function buildStatusMap(userId: string, gameIds: string[]) {
	const rows = await backlogService.findBacklogSummariesByUserAndGameIds(
		userId,
		gameIds,
		false
	);
	const map = new Map<string, string>();
	for (const row of rows) map.set(row.gameId, row.status);
	return map;
}

export async function postFranchise(request: Request, response: Response) {
	const registerFranchiseDto = request.locals.body as RegisterFranchiseDto;

	const franchise =
		await franchiseService.registerFranchise(registerFranchiseDto);
	const franchisePlain = franchise.get({ plain: true });

	const data = { franchise: franchisePlain };
	return response.status(201).json({ data });
}

export async function patchFranchise(request: Request, response: Response) {
	const updateFranchiseDto = request.locals.body as UpdateFranchiseDto;
	const { franchiseId } = request.locals.params as FranchiseIdParam;

	const franchise = await franchiseService.updateFranchise(
		franchiseId,
		updateFranchiseDto
	);
	const franchisePlain = franchise.get({ plain: true });

	const data = { franchise: franchisePlain };
	return response.status(200).json({ data });
}

export async function deleteFranchise(request: Request, response: Response) {
	const { franchiseId } = request.locals.params as FranchiseIdParam;

	const removed = await franchiseService.removeFranchise(franchiseId);
	if (!removed) throw franchiseDomainError.franchiseNotFound();

	return response.sendStatus(204);
}
