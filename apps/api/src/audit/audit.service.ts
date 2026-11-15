import { type WhereOptions } from "sequelize";

import { PinoLogger } from "../common/logger/pino.logger";
import * as gamesService from "../games/games.service";
import * as usersService from "../users/users.service";
import { type AuditFilters } from "./audit.interface";
import { AuditLog } from "./audit.model";

const DEFAULT_AUDIT_PAGE_SIZE = 50;

const logger = new PinoLogger("Audit Service");

export function record(
	userId: string,
	action: string,
	targetType: string,
	targetId: string
) {
	AuditLog.create({ userId, action, targetType, targetId }).catch(error =>
		logger.warn("record", "failed", {
			action,
			error: error instanceof Error ? error.message : String(error)
		})
	);
}

export async function findAll(
	limit = DEFAULT_AUDIT_PAGE_SIZE,
	offset = 0,
	filters: AuditFilters = {}
) {
	const where: WhereOptions = {
		...(filters.action && { action: filters.action }),
		...(filters.targetType && { targetType: filters.targetType })
	};
	const { rows, count } = await AuditLog.findAndCountAll({
		where,
		include: [
			{
				association: "User",
				attributes: ["id", "username", "name"]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		limit,
		offset
	});

	const gameIds = rows
		.filter(r => r.targetType === "game")
		.map(r => r.targetId);
	const userIds = rows
		.filter(r => r.targetType === "user")
		.map(r => r.targetId);

	const [games, users] = await Promise.all([
		gamesService.findGamesByIds(gameIds),
		usersService.findUsersByIds(userIds)
	]);

	const gameById = new Map(games.map(g => [g.id, g]));
	const userById = new Map(users.map(u => [u.id, u]));

	return { rows, count, gameById, userById };
}
