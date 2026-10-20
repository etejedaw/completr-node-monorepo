import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import * as authService from "../auth/auth.service";
import { getDeviceInfo } from "../auth/utils/device-info.util";
import { setRefreshCookie } from "../auth/utils/refresh-cookie.util";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { userMeSerializer } from "../users";
import * as usersService from "../users/users.service";
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
	auditService.record(admin.id, "user_invited", "invitation", invitation.id);

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
		"invitation_revoked",
		"invitation",
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

	const invitation = await invitationsService.findUsableInvitation(token);
	if (!invitation) throw invitationsDomainError.invitationInvalidToken();

	const registration = await authService.register(
		{ username, name, password, email: invitation.email },
		getDeviceInfo(request)
	);
	await invitationsService.deleteInvitation(invitation.id);

	setRefreshCookie(response, registration.refreshToken);

	const data = {
		user: userMeSerializer(registration.user.get({ plain: true })),
		access_token: registration.accessToken,
		session_id: registration.sessionId
	};
	return response.status(201).json({ data });
}
