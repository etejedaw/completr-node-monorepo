import { Op } from "sequelize";

import { isPremiumRole } from "../common/utils/is-premium-role.util";
import * as premiumAccessServiceError from "./errors/premium-access.service-error";
import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES,
	type PremiumFeature
} from "./premium-access.constants";
import {
	type PremiumAccess,
	type PremiumAccessUser
} from "./premium-access.interface";
import { type PremiumAccessSource } from "./premium-access.types";
import { PremiumGrant } from "./premium-grant.model";

const DENIED_ACCESS: PremiumAccess = {
	allowed: false,
	source: null,
	expiresAt: null
};

export async function resolvePremiumAccess(
	user: PremiumAccessUser,
	feature: PremiumFeature | typeof FULL_PREMIUM_FEATURE,
	now = new Date()
): Promise<PremiumAccess> {
	if (isPremiumRole(user.role)) return accessFrom("role", null);

	try {
		const grants = await PremiumGrant.findAll({
			attributes: ["userId", "feature", "expiresAt"],
			where: {
				[Op.and]: [
					{
						[Op.or]: [
							{ userId: user.id, feature: FULL_PREMIUM_FEATURE },
							{ userId: user.id, feature },
							{ userId: null, feature }
						]
					},
					{
						[Op.or]: [
							{ expiresAt: null },
							{ expiresAt: { [Op.gt]: now } }
						]
					}
				]
			}
		});

		const fullGrant = mostFavorableGrant(
			grants.filter(
				grant =>
					grant.userId === user.id &&
					grant.feature === FULL_PREMIUM_FEATURE
			)
		);
		if (fullGrant) return accessFrom("full-grant", fullGrant.expiresAt);

		const individualGrant = mostFavorableGrant(
			grants.filter(
				grant => grant.userId === user.id && grant.feature === feature
			)
		);
		const globalGrant = mostFavorableGrant(
			grants.filter(
				grant => grant.userId === null && grant.feature === feature
			)
		);
		const featureGrant = individualGrant ?? globalGrant;
		if (featureGrant)
			return accessFrom("feature-grant", featureGrant.expiresAt);

		return DENIED_ACCESS;
	} catch (error) {
		throw premiumAccessServiceError.internalError(error);
	}
}

export async function resolvePremiumStatus(
	user: PremiumAccessUser,
	now = new Date()
) {
	const access = await resolvePremiumAccess(user, FULL_PREMIUM_FEATURE, now);
	return {
		active: access.allowed,
		source:
			access.source === "role" || access.source === "full-grant"
				? access.source
				: null,
		expiresAt: access.allowed ? access.expiresAt : null
	};
}

export async function resolvePremiumFeatures(
	user: PremiumAccessUser,
	now = new Date()
): Promise<PremiumFeature[]> {
	if (isPremiumRole(user.role)) return [...PREMIUM_FEATURES];

	try {
		const grants = await PremiumGrant.findAll({
			attributes: ["userId", "feature", "expiresAt"],
			where: {
				[Op.and]: [
					{ [Op.or]: [{ userId: user.id }, { userId: null }] },
					{
						[Op.or]: [
							{ expiresAt: null },
							{ expiresAt: { [Op.gt]: now } }
						]
					}
				]
			}
		});

		const hasFullGrant = grants.some(
			grant =>
				grant.userId === user.id &&
				grant.feature === FULL_PREMIUM_FEATURE
		);
		if (hasFullGrant) return [...PREMIUM_FEATURES];

		const grantedFeatures = new Set<string>(
			grants.map(grant => grant.feature)
		);
		return PREMIUM_FEATURES.filter(feature => grantedFeatures.has(feature));
	} catch (error) {
		throw premiumAccessServiceError.internalError(error);
	}
}

export async function findFullPremiumUserIds(
	users: PremiumAccessUser[],
	now = new Date()
) {
	const premiumUserIds = new Set(
		users.filter(user => isPremiumRole(user.role)).map(user => user.id)
	);
	const grantedUserIds = users
		.filter(user => !isPremiumRole(user.role))
		.map(user => user.id);
	if (grantedUserIds.length === 0) return premiumUserIds;

	try {
		const grants = await PremiumGrant.findAll({
			attributes: ["userId"],
			where: {
				userId: { [Op.in]: grantedUserIds },
				feature: FULL_PREMIUM_FEATURE,
				expiresAt: { [Op.gt]: now }
			}
		});
		for (const grant of grants) {
			if (grant.userId) premiumUserIds.add(grant.userId);
		}
		return premiumUserIds;
	} catch (error) {
		throw premiumAccessServiceError.internalError(error);
	}
}

function mostFavorableGrant(grants: PremiumGrant[]) {
	return grants.reduce<PremiumGrant | undefined>((best, grant) => {
		if (!best) return grant;
		if (best.expiresAt === null) return best;
		if (grant.expiresAt === null || grant.expiresAt > best.expiresAt)
			return grant;
		return best;
	}, undefined);
}

function accessFrom(
	source: Exclude<PremiumAccessSource, null>,
	expiresAt: Date | null
): PremiumAccess {
	return {
		allowed: true,
		source,
		expiresAt: expiresAt?.toISOString() ?? null
	};
}
