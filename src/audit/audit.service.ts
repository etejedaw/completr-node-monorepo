import { AuditLog } from "./audit.model";
import { User } from "../users/user.model";
import { Game } from "../games/game.model";

export function record(
	userId: string,
	action: string,
	targetType: string,
	targetId: string
) {
	AuditLog.create({ userId, action, targetType, targetId }).catch(
		Function.prototype as () => void
	);
}

export async function findAll(
	limit = 50,
	offset = 0,
	filters: { action?: string; targetType?: string } = {}
) {
	const where: Record<string, unknown> = {};
	if (filters.action) where["action"] = filters.action;
	if (filters.targetType) where["targetType"] = filters.targetType;
	const { rows, count } = await AuditLog.findAndCountAll({
		where,
		include: [
			{
				model: User,
				attributes: ["id", "username", "name"]
			}
		],
		order: [["createdAt", "DESC"]],
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
		gameIds.length > 0
			? Game.findAll({
					where: { id: gameIds },
					attributes: ["id", "code", "title"]
				})
			: Promise.resolve([]),
		userIds.length > 0
			? User.findAll({
					where: { id: userIds },
					attributes: ["id", "username", "name"]
				})
			: Promise.resolve([])
	]);

	const gameById = new Map(games.map(g => [g.id, g]));
	const userById = new Map(users.map(u => [u.id, u]));

	return { rows, count, gameById, userById };
}
