import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type UpdateAdminRewindDto } from "./dtos/update-admin-rewind.dto";
import { rewindAdminSerializer } from "./rewind-admin.serializer";
import { type AdminRewindIdParam } from "./schemas/admin-rewind-id-params.schema";
import { type AdminRewindsQuery } from "./schemas/admin-rewinds-query.schema";
import * as rewindAdminService from "./services/rewind-admin.service";

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
	const { rewindId } = request.locals.params as AdminRewindIdParam;
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
