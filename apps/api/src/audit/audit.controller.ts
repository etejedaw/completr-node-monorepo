import { type Request, type Response } from "express";

import { auditLogSerializer } from "./audit.serializer";
import * as auditService from "./audit.service";
import { type AuditQuery } from "./audit-query.schema";

export async function getAuditLog(request: Request, response: Response) {
	const { limit, offset, action, targetType } = request.locals
		.query as AuditQuery;

	const { rows, count, gameById, userById } = await auditService.findAll(
		limit,
		offset,
		{ action, targetType }
	);

	const data = {
		logs: rows.map(log => auditLogSerializer(log, { gameById, userById })),
		total: count
	};
	return response.status(200).json({ data });
}
