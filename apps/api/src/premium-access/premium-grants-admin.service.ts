import * as premiumAccessDomainError from "./errors/premium-access.domain-error";
import * as premiumAccessServiceError from "./errors/premium-access.service-error";
import {
	FULL_PREMIUM_FEATURE,
	type PremiumGrantFeature
} from "./premium-access.constants";
import { PremiumGrant } from "./premium-grant.model";

export interface PremiumGrantExpirationInput {
	feature: PremiumGrantFeature;
	expiresAt: string | null;
}

export type UpdatePremiumGrantExpirationInput = Omit<
	PremiumGrantExpirationInput,
	"feature"
>;

export async function createPremiumGrant(
	userId: string,
	input: PremiumGrantExpirationInput,
	now = new Date()
) {
	return PremiumGrant.create({
		userId,
		feature: input.feature,
		expiresAt: resolveExpiration(input, now),
		offerCode: null
	});
}

export async function findPremiumGrantsByUserId(userId: string) {
	return PremiumGrant.findAll({
		where: { userId },
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function updatePremiumGrantExpiration(
	userId: string,
	grantId: string,
	input: UpdatePremiumGrantExpirationInput,
	now = new Date()
) {
	const grant = await findOwnedGrant(userId, grantId);
	assertGrantIsActive(grant, now);
	await grant.update({
		expiresAt: resolveExpiration({ ...input, feature: grant.feature }, now)
	});
	return grant;
}

export async function revokePremiumGrant(
	userId: string,
	grantId: string,
	now = new Date()
) {
	const grant = await findOwnedGrant(userId, grantId);
	assertGrantIsActive(grant, now);
	await grant.update({ expiresAt: now });
	return grant;
}

async function findOwnedGrant(userId: string, grantId: string) {
	const grant = await PremiumGrant.findOne({
		where: { id: grantId, userId }
	});
	if (!grant) throw premiumAccessDomainError.premiumGrantNotFound();
	return grant;
}

function assertGrantIsActive(grant: PremiumGrant, now: Date) {
	if (grant.expiresAt !== null && grant.expiresAt <= now)
		throw premiumAccessServiceError.premiumGrantNotActive();
}

function resolveExpiration(input: PremiumGrantExpirationInput, now: Date) {
	if (input.feature === FULL_PREMIUM_FEATURE && input.expiresAt === null)
		throw premiumAccessDomainError.premiumGrantInvalidExpiration();
	if (input.expiresAt === null) return null;

	const expiresAt = new Date(input.expiresAt);
	if (expiresAt <= now)
		throw premiumAccessDomainError.premiumGrantInvalidExpiration();
	return expiresAt;
}
