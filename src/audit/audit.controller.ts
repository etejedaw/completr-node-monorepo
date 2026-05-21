import { Request, Response } from "express";
import * as auditService from "./audit.service";

export async function getAuditLog(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as {
		limit?: number;
		offset?: number;
		action?: string;
		targetType?: string;
	};

	const { rows, count, gameById, userById } = await auditService.findAll(
		query.limit ?? 50,
		query.offset ?? 0,
		{ action: query.action, targetType: query.targetType }
	);

	const data = {
		logs: rows.map(log => {
			let target: {
				type: string;
				id: string;
				label: string;
				code?: string;
				username?: string;
			};
			if (log.targetType === "game") {
				const g = gameById.get(log.targetId);
				target = {
					type: "game",
					id: log.targetId,
					label: g?.title ?? log.targetId,
					code: g?.code
				};
			} else if (log.targetType === "user") {
				const u = userById.get(log.targetId);
				target = {
					type: "user",
					id: log.targetId,
					label: u?.name || u?.username || log.targetId,
					username: u?.username
				};
			} else {
				target = {
					type: log.targetType,
					id: log.targetId,
					label: log.targetId
				};
			}
			return {
				id: log.id,
				user: log.User
					? {
							id: log.User.id,
							username: log.User.username,
							name: log.User.name
						}
					: null,
				action: log.action,
				targetType: log.targetType,
				targetId: log.targetId,
				target,
				createdAt: log.createdAt
			};
		}),
		total: count
	};
	return response.status(200).json({ data });
}
