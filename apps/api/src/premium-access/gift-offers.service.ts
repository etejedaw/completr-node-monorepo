import { Op, type Transaction, UniqueConstraintError } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import * as premiumAccessDomainError from "./errors/premium-access.domain-error";
import {
	type GiftOfferView,
	type NormalizedGiftOffer
} from "./gift-offers.interface";
import { type PremiumAccessUser } from "./premium-access.interface";
import { resolvePremiumAccess } from "./premium-access.service";
import { PremiumGrant } from "./premium-grant.model";
import { PremiumPromotion } from "./premium-promotion.model";

export async function listGiftOffers(
	user: PremiumAccessUser,
	now = new Date()
): Promise<GiftOfferView[]> {
	const grants = await PremiumGrant.findAll({
		where: { userId: user.id, offerCode: { [Op.ne]: null } }
	});
	const grantsByCode = new Map(grants.map(grant => [grant.offerCode, grant]));
	const promotions = await PremiumPromotion.findAll({
		where: {
			[Op.or]: [
				{ startsAt: { [Op.lte]: now }, endsAt: { [Op.gt]: now } },
				{ code: { [Op.in]: [...grantsByCode.keys()] as string[] } }
			]
		},
		order: [
			["startsAt", "ASC"],
			["code", "ASC"]
		]
	});
	const offers = promotions.map(normalizePromotion);
	return Promise.all(
		offers.map(async offer => {
			const access = await resolvePremiumAccess(user, offer.feature, now);
			return serializeGiftOffer(
				offer,
				grantsByCode.get(offer.code),
				access.allowed,
				now
			);
		})
	);
}

export async function claimGiftOffer(
	user: PremiumAccessUser,
	offerCode: string,
	now?: Date
): Promise<{ offer: GiftOfferView; created: boolean }> {
	const offer = await findOffer(offerCode);
	if (!offer) throw premiumAccessDomainError.giftOfferNotFound();

	const previousGrant = await findOfferGrant(user.id, offerCode);
	if (previousGrant) {
		return respondWithOffer(user, offer, previousGrant, false, now);
	}
	const checkedAt = now ?? new Date();
	if (isHiddenScheduledPromotion(offer, checkedAt))
		throw premiumAccessDomainError.giftOfferNotFound();
	if (!isOfferAvailable(offer, checkedAt))
		throw premiumAccessDomainError.giftOfferNotEligible();

	const access = await resolvePremiumAccess(user, offer.feature, checkedAt);
	if (access.allowed) throw premiumAccessDomainError.giftOfferNotEligible();

	try {
		const claim = await sequelize.transaction(async transaction => {
			const lockedOffer = await lockOffer(offer, transaction);
			const claimedAt = now ?? new Date();
			const existing = await findOfferGrant(
				user.id,
				offerCode,
				transaction
			);
			if (existing) {
				return {
					offer: lockedOffer,
					grant: existing,
					created: false,
					claimedAt
				};
			}
			if (isHiddenScheduledPromotion(lockedOffer, claimedAt))
				throw premiumAccessDomainError.giftOfferNotFound();
			if (!isOfferAvailable(lockedOffer, claimedAt))
				throw premiumAccessDomainError.giftOfferNotEligible();
			const grant = await PremiumGrant.create(
				{
					userId: user.id,
					feature: lockedOffer.feature,
					expiresAt: lockedOffer.availableUntil,
					offerCode: lockedOffer.code
				},
				{ transaction }
			);
			return { offer: lockedOffer, grant, created: true, claimedAt };
		});
		return respondWithOffer(
			user,
			claim.offer,
			claim.grant,
			claim.created,
			claim.claimedAt
		);
	} catch (error) {
		if (!(error instanceof UniqueConstraintError)) throw error;
		const grant = await findOfferGrant(user.id, offerCode);
		if (!grant) throw error;
		return respondWithOffer(user, offer, grant, false, now);
	}
}

async function findOffer(
	offerCode: string
): Promise<NormalizedGiftOffer | undefined> {
	const promotion = await PremiumPromotion.findOne({
		where: { code: offerCode }
	});
	return promotion ? normalizePromotion(promotion) : undefined;
}

async function lockOffer(
	offer: NormalizedGiftOffer,
	transaction: Transaction
): Promise<NormalizedGiftOffer> {
	const promotion = await PremiumPromotion.findOne({
		where: { code: offer.code },
		transaction,
		lock: transaction.LOCK.SHARE
	});
	if (!promotion) throw premiumAccessDomainError.giftOfferNotFound();
	return normalizePromotion(promotion);
}

async function respondWithOffer(
	user: PremiumAccessUser,
	offer: NormalizedGiftOffer,
	grant: PremiumGrant,
	created: boolean,
	now = new Date()
) {
	const access = await resolvePremiumAccess(user, offer.feature, now);
	return {
		offer: serializeGiftOffer(offer, grant, access.allowed, now),
		created
	};
}

function normalizePromotion(promotion: PremiumPromotion): NormalizedGiftOffer {
	return {
		code: promotion.code,
		feature: promotion.feature,
		availableFrom: promotion.startsAt,
		availableUntil: promotion.endsAt
	};
}

function serializeGiftOffer(
	offer: NormalizedGiftOffer,
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
		availableFrom: offer.availableFrom.toISOString(),
		availableUntil: offer.availableUntil.toISOString(),
		status,
		expiresAt: grant?.expiresAt?.toISOString() ?? null,
		canActivate: status === "available",
		hasAccess
	};
}

function isOfferAvailable(offer: NormalizedGiftOffer, now: Date) {
	return offer.availableFrom <= now && offer.availableUntil > now;
}

function isHiddenScheduledPromotion(offer: NormalizedGiftOffer, now: Date) {
	return offer.availableFrom > now;
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
