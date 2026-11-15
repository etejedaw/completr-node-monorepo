import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { resolveCurrentRewindDay } from "../rewind/utils/resolve-current-rewind-day.util";
import { type CreateRewindEditionDto } from "./dtos/create-rewind-edition.dto";
import { type UpdateRewindEditionDto } from "./dtos/update-rewind-edition.dto";
import { REWIND_DESIGNS } from "./rewind-editions.constants";
import { rewindEditionAdminSerializer } from "./rewind-editions-admin.serializer";
import * as rewindEditionsAdminService from "./rewind-editions-admin.service";
import { type RewindEditionYearParam } from "./schemas/rewind-edition-year-params.schema";

export async function getRewindEditions(_request: Request, response: Response) {
	const editions =
		await rewindEditionsAdminService.findRewindEditionsWithStats();
	const today = resolveCurrentRewindDay();
	return response.status(200).json({
		data: {
			editions: editions.map(edition =>
				rewindEditionAdminSerializer(edition, today)
			),
			designs: REWIND_DESIGNS
		}
	});
}

export async function postRewindEdition(request: Request, response: Response) {
	const dto = request.locals.body as CreateRewindEditionDto;
	const admin = request.locals.user as RequestUser;
	const created = await rewindEditionsAdminService.createRewindEdition(dto);
	auditService.record(
		admin.id,
		"rewind_edition_created",
		"rewind_edition",
		String(created.edition.year)
	);
	return response.status(201).json({
		data: {
			edition: rewindEditionAdminSerializer(
				created,
				resolveCurrentRewindDay()
			)
		}
	});
}

export async function putRewindEdition(request: Request, response: Response) {
	const { year } = request.locals.params as RewindEditionYearParam;
	const dto = request.locals.body as UpdateRewindEditionDto;
	const admin = request.locals.user as RequestUser;
	const { affectedRewinds, ...updated } =
		await rewindEditionsAdminService.updateRewindEdition(year, dto);
	auditService.record(
		admin.id,
		"rewind_edition_updated",
		"rewind_edition",
		String(year)
	);
	return response.status(200).json({
		data: {
			edition: rewindEditionAdminSerializer(
				updated,
				resolveCurrentRewindDay()
			),
			affectedRewinds
		}
	});
}
