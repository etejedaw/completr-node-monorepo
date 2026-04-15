import { Request, Response } from "express";
import * as auditService from "./audit.service";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";

export async function getAuditLog(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as PaginationQuery;

	const { rows, count } = await auditService.findAll(
		query.limit ?? 50,
		query.offset ?? 0
	);

	const data = {
		logs: rows.map(log => ({
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
			createdAt: log.createdAt
		})),
		total: count
	};
	return response.status(200).json({ data });
}
