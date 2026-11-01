import { Op, type Transaction, UniqueConstraintError } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import * as premiumAccessDomainError from "./errors/premium-access.domain-error";
import { GIFT_OFFERS, type GiftOfferDefinition } from "./gift-offers.constants";
import { type GiftOfferView } from "./gift-offers.interface";
import { type PremiumAccessUser } from "./premium-access.interface";
import { resolvePremiumAccess } from "./premium-access.service";
import { PremiumGrant } from "./premium-grant.model";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listGiftOffers(
	user: PremiumAccessUser,
	now = new Date()
): Promise<GiftOfferView[]> {
	const grants = await PremiumGrant.findAll({
		where: {
			userId: user.id,
			offerCode: { [Op.in]: GIFT_OFFERS.map(offer => offer.code) }
		}
	});
	return Promise.all(
		GIFT_OFFERS.map(async offer => {
			const grant = grants.find(
				candidate => candidate.offerCode === offer.code
			);
			const access = await resolvePremiumAccess(user, offer.feature, now);
			return serializeGiftOffer(offer, grant, access.allowed, now);
		})
	);
}

export async function claimGiftOffer(
	user: PremiumAccessUser,
	offerCode: string,
	now = new Date()
) {
	const offer = GIFT_OFFERS.find(candidate => candidate.code === offerCode);
	if (!offer) throw premiumAccessDomainError.giftOfferNotFound();

	const previousGrant = await findOfferGrant(user.id, offerCode);
	if (previousGrant) return { grant: previousGrant, created: false };
	if (!isOfferAvailable(offer, now))
		throw premiumAccessDomainError.giftOfferNotEligible();

	const access = await resolvePremiumAccess(user, offer.feature, now);
	if (access.allowed) throw premiumAccessDomainError.giftOfferNotEligible();

	try {
		return await sequelize.transaction(async transaction => {
			const existing = await findOfferGrant(
				user.id,
				offerCode,
				transaction
			);
			if (existing) return { grant: existing, created: false };
			const grant = await PremiumGrant.create(
				{
					userId: user.id,
					feature: offer.feature,
					expiresAt: new Date(now.getTime() + offer.durationMs),
					offerCode: offer.code
				},
				{ transaction }
			);
			return { grant, created: true };
		});
	} catch (error) {
		if (!(error instanceof UniqueConstraintError)) throw error;
		const grant = await findOfferGrant(user.id, offerCode);
		if (!grant) throw error;
		return { grant, created: false };
	}
}

function serializeGiftOffer(
	offer: GiftOfferDefinition,
	grant: PremiumGrant | undefined,
	hasAccess: boolean,
	now: Date
): GiftOfferView {
	const grantIsActive =
		grant && (grant.expiresAt === null || grant.expiresAt > now);
	const status = grantIsActive
		? "active"
		: grant
			? "used"
			: !isOfferAvailable(offer, now)
				? "expired"
				: hasAccess
					? "not-eligible"
					: "available";
	return {
		code: offer.code,
		feature: offer.feature,
		durationDays: offer.durationMs / DAY_MS,
		status,
		expiresAt: grant?.expiresAt?.toISOString() ?? null,
		canActivate: status === "available",
		hasAccess
	};
}

function isOfferAvailable(offer: GiftOfferDefinition, now: Date) {
	return (
		(!offer.availableFrom || new Date(offer.availableFrom) <= now) &&
		(!offer.availableUntil || new Date(offer.availableUntil) > now)
	);
}

function findOfferGrant(
	userId: string,
	offerCode: string,
	transaction?: Transaction
) {
	return PremiumGrant.findOne({
		where: { userId, offerCode },
		...(transaction && { transaction, lock: transaction.LOCK.UPDATE })
	});
}
