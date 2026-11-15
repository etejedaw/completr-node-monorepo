import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { rewindAdminSerializer } from "./rewind-admin.serializer";
import * as rewindAdminService from "./rewind-admin.service";
import {
	type AdminRewindParams,
	type AdminRewindsQuery,
	type UpdateAdminRewindDto
} from "./schemas/rewind-admin.schemas";

export async function getAdminRewinds(request: Request, response: Response) {
	const query = request.locals.query as AdminRewindsQuery;
	const { items, total } = await rewindAdminService.findAdminRewinds(query);
	return response.status(200).json({
		data: {
			rewinds: items.map(rewindAdminSerializer),
			total
		}
	});
}

export async function patchAdminRewind(request: Request, response: Response) {
	const { rewindId } = request.locals.params as AdminRewindParams;
	const dto = request.locals.body as UpdateAdminRewindDto;
	const admin = request.locals.user as RequestUser;
	const item = await rewindAdminService.updateAdminRewindRegenerations(
		rewindId,
		dto.regenerationsLeft
	);
	auditService.record(admin.id, "rewind_edited", "rewind", rewindId);
	return response
		.status(200)
		.json({ data: { rewind: rewindAdminSerializer(item) } });
}
