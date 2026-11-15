import { type Request, type Response } from "express";

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "../audit/audit.constants";
import * as auditService from "../audit/audit.service";
import { authTokensSerializer } from "../auth/auth.serializer";
import * as authService from "../auth/auth.service";
import { getDeviceInfo } from "../auth/utils/device-info.util";
import { setRefreshCookie } from "../auth/utils/refresh-cookie.util";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/services/users.service";
import { buildUserMe } from "../users/services/users-me.service";
import { type AcceptInvitationDto } from "./dtos/accept-invitation.dto";
import { type CreateInvitationDto } from "./dtos/create-invitation.dto";
import * as invitationsDomainError from "./errors/invitations.domain-error";
import { invitationSerializer } from "./invitations.serializer";
import * as invitationsService from "./invitations.service";
import { type InvitationIdParam } from "./schemas/invitation-id-params.schema";
import { type InvitationTokenParam } from "./schemas/invitation-token-params.schema";

export async function postInvitation(request: Request, response: Response) {
	const { email } = request.locals.body as CreateInvitationDto;
	const admin = request.locals.user as RequestUser;

	if (await usersService.isEmailRegistered(email))
		throw invitationsDomainError.invitationEmailRegistered();

	const invitation = await invitationsService.inviteUser(email, admin.id);
	auditService.record(
		admin.id,
		AUDIT_ACTIONS.userInvited,
		AUDIT_TARGET_TYPES.invitation,
		invitation.id
	);

	const data = { invitation: invitationSerializer(invitation) };
	return response.status(201).json({ data });
}

export async function getInvitations(_request: Request, response: Response) {
	const invitations = await invitationsService.findAllInvitations();

	const data = { invitations: invitations.map(invitationSerializer) };
	return response.status(200).json({ data });
}

export async function deleteInvitation(request: Request, response: Response) {
	const { invitationId } = request.locals.params as InvitationIdParam;
	const admin = request.locals.user as RequestUser;

	const deleted = await invitationsService.deleteInvitation(invitationId);
	if (!deleted) throw invitationsDomainError.invitationNotFound();

	auditService.record(
		admin.id,
		AUDIT_ACTIONS.invitationRevoked,
		AUDIT_TARGET_TYPES.invitation,
		invitationId
	);

	return response.sendStatus(204);
}

export async function getInvitationByToken(
	request: Request,
	response: Response
) {
	const { token } = request.locals.params as InvitationTokenParam;

	const invitation = await invitationsService.findUsableInvitation(token);
	if (!invitation) throw invitationsDomainError.invitationInvalidToken();

	const data = {
		invitation: { email: invitation.email, expiresAt: invitation.expiresAt }
	};
	return response.status(200).json({ data });
}

export async function postAcceptInvitation(
	request: Request,
	response: Response
) {
	const { token, username, name, password } = request.locals
		.body as AcceptInvitationDto;

	const registration = await invitationsService.acceptInvitation(
		token,
		email =>
			authService.register(
				{ username, name, password, email },
				getDeviceInfo(request)
			)
	);

	setRefreshCookie(response, registration.refreshToken);

	const userPlain = registration.user.get({ plain: true });
	const data = {
		user: await buildUserMe(userPlain),
		...authTokensSerializer(registration)
	};
	return response.status(201).json({ data });
}
