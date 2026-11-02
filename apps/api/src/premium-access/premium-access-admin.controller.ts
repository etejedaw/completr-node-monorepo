import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as userDomain from "../users/errors/users.domain-error";
import { type UserIdParam } from "../users/schemas/user-id-params.schema";
import * as usersService from "../users/users.service";
import { PREMIUM_FEATURE_DEFINITIONS } from "./premium-access.constants";
import { premiumGrantSerializer } from "./premium-access.serializer";
import * as premiumGrantsAdminService from "./premium-grants-admin.service";
import {
	type CreatePremiumGrantDto,
	type PremiumGrantParams,
	type UpdatePremiumGrantDto
} from "./schemas/premium-grant.schemas";

export async function getPremiumFeatures(
	_request: Request,
	response: Response
) {
	return response
		.status(200)
		.json({ data: { features: PREMIUM_FEATURE_DEFINITIONS } });
}

export async function getPremiumGrants(request: Request, response: Response) {
	const { userId } = request.locals.params as UserIdParam;
	const user = await usersService.findUserByIdUnfiltered(userId);
	if (!user) throw userDomain.userNotFound();
	const grants =
		await premiumGrantsAdminService.findPremiumGrantsByUserId(userId);
	return response
		.status(200)
		.json({ data: { grants: grants.map(premiumGrantSerializer) } });
}

export async function postPremiumGrant(request: Request, response: Response) {
	const { userId } = request.locals.params as UserIdParam;
	const dto = request.locals.body as CreatePremiumGrantDto;
	const admin = request.locals.user as RequestUser;
	const user = await usersService.findUserByIdUnfiltered(userId);
	if (!user) throw userDomain.userNotFound();
	const grant = await premiumGrantsAdminService.createPremiumGrant(
		userId,
		dto
	);
	auditService.record(
		admin.id,
		"premium_grant_created",
		"premium_grant",
		grant.id
	);
	return response
		.status(201)
		.json({ data: { grant: premiumGrantSerializer(grant) } });
}

export async function patchPremiumGrant(request: Request, response: Response) {
	const { userId, grantId } = request.locals.params as PremiumGrantParams;
	const dto = request.locals.body as UpdatePremiumGrantDto;
	const admin = request.locals.user as RequestUser;
	const grant = await premiumGrantsAdminService.updatePremiumGrantExpiration(
		userId,
		grantId,
		dto
	);
	auditService.record(
		admin.id,
		"premium_grant_updated",
		"premium_grant",
		grant.id
	);
	return response
		.status(200)
		.json({ data: { grant: premiumGrantSerializer(grant) } });
}

export async function postRevokePremiumGrant(
	request: Request,
	response: Response
) {
	const { userId, grantId } = request.locals.params as PremiumGrantParams;
	const admin = request.locals.user as RequestUser;
	const grant = await premiumGrantsAdminService.revokePremiumGrant(
		userId,
		grantId
	);
	auditService.record(
		admin.id,
		"premium_grant_revoked",
		"premium_grant",
		grant.id
	);
	return response
		.status(200)
		.json({ data: { grant: premiumGrantSerializer(grant) } });
}
