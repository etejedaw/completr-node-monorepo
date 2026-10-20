import { Op } from "sequelize";

import { environmentConfig } from "../common/config/environment.config";
import { smtpSettings } from "../common/config/mail.config";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../common/utils/one-time-token.util";
import * as mailServiceError from "../mail/errors/mail.service-error";
import { MailClient } from "../mail/mail.provider";
import * as invitationsServiceError from "./errors/invitations.service-error";
import { buildInvitationEmail } from "./invitation-email.util";
import { UserInvitation } from "./user-invitation.model";

const ACCEPT_INVITATION_PATH = "/accept-invite";
const DAYS_TO_MS = 24 * 60 * 60 * 1000;

const mail = MailClient.create(smtpSettings);

export async function inviteUser(email: string, invitedById: string) {
	if (!mail.isEnabled) throw mailServiceError.disabledError();

	const { rawToken, tokenHash } = generateOneTimeToken();
	const invitation = await replaceInvitation(email, tokenHash, invitedById);

	try {
		await mail.send({ to: email, ...invitationEmail(rawToken) });
	} catch (error) {
		await invitation.destroy();
		throw error;
	}

	return invitation;
}

async function replaceInvitation(
	email: string,
	tokenHash: string,
	invitedById: string
) {
	const expiresAt = new Date(
		Date.now() + environmentConfig.USER_INVITATION_TTL_DAYS * DAYS_TO_MS
	);

	try {
		await UserInvitation.destroy({ where: { email } });
		return await UserInvitation.create({
			email,
			tokenHash,
			invitedById,
			expiresAt
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: invitationsServiceError.uniqueConstraintError,
			validation: invitationsServiceError.validationError
		});
	}
}

function invitationEmail(rawToken: string) {
	const acceptUrl = new URL(
		ACCEPT_INVITATION_PATH,
		environmentConfig.WEB_APP_URL
	);
	acceptUrl.searchParams.set("token", rawToken);

	return buildInvitationEmail(
		acceptUrl.toString(),
		environmentConfig.USER_INVITATION_TTL_DAYS,
		environmentConfig.WEB_APP_URL
	);
}

export async function findAllInvitations() {
	return UserInvitation.findAll({ order: [["createdAt", "DESC"]] });
}

export async function deleteInvitation(id: string): Promise<boolean> {
	const deleted = await UserInvitation.destroy({ where: { id } });
	return deleted > 0;
}

export async function findUsableInvitation(rawToken: string) {
	return UserInvitation.findOne({
		where: {
			tokenHash: hashOneTimeToken(rawToken),
			expiresAt: { [Op.gt]: new Date() }
		}
	});
}
