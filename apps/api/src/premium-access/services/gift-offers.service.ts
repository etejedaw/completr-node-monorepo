import { Op, type Transaction, UniqueConstraintError } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import * as premiumAccessServiceError from "../errors/premium-access.service-error";
import {
	type GiftOfferClaim,
	type GiftOfferState,
	type LockedGiftOfferClaim,
	type NormalizedGiftOffer
} from "../gift-offers.interface";
import { FULL_PREMIUM_FEATURE } from "../premium-access.constants";
import { type PremiumAccessUser } from "../premium-access.interface";
import { PremiumGrant } from "../premium-grant.model";
import { PremiumPromotion } from "../premium-promotion.model";
import { isGiftOfferAvailable } from "../utils/is-gift-offer-available.util";
import { isGiftOfferScheduled } from "../utils/is-gift-offer-scheduled.util";
import {
	resolvePremiumAccess,
	resolvePremiumFeatures
} from "./premium-access.service";

export async function listGiftOffers(
	user: PremiumAccessUser,
	now = new Date()
): Promise<GiftOfferState[]> {
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
	const [grantedFeatures, fullAccess] = await Promise.all([
		resolvePremiumFeatures(user, now),
		resolvePremiumAccess(user, FULL_PREMIUM_FEATURE, now)
	]);
	return promotions.map(promotion => {
		const offer = normalizePromotion(promotion);
		const hasAccess =
			offer.feature === FULL_PREMIUM_FEATURE
				? fullAccess.allowed
				: grantedFeatures.includes(offer.feature);
		return {
			offer,
			grant: grantsByCode.get(offer.code) ?? null,
			hasAccess,
			evaluatedAt: now
		};
	});
}

export async function claimGiftOffer(
	user: PremiumAccessUser,
	offerCode: string,
	now?: Date
): Promise<GiftOfferClaim> {
	const clock = () => now ?? new Date();
	const offer = await findOffer(offerCode);
	if (!offer) throw premiumAccessServiceError.giftOfferNotFound();

	const previousGrant = await findOfferGrant(user.id, offerCode);
	if (previousGrant)
		return describeClaim(user, offer, previousGrant, false, clock());

	const checkedAt = clock();
	assertOfferOpen(offer, checkedAt);
	const access = await resolvePremiumAccess(user, offer.feature, checkedAt);
	if (access.allowed) throw premiumAccessServiceError.giftOfferNotEligible();

	try {
		const claim = await sequelize.transaction(transaction =>
			claimLockedOffer(user.id, offerCode, clock, transaction)
		);
		return describeClaim(
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
		return describeClaim(user, offer, grant, false, clock());
	}
}

async function claimLockedOffer(
	userId: string,
	offerCode: string,
	clock: () => Date,
	transaction: Transaction
): Promise<LockedGiftOfferClaim> {
	const offer = await lockOffer(offerCode, transaction);
	const claimedAt = clock();
	const existing = await findOfferGrant(userId, offerCode, transaction);
	if (existing) return { offer, grant: existing, created: false, claimedAt };

	assertOfferOpen(offer, claimedAt);
	const grant = await PremiumGrant.create(
		{
			userId,
			feature: offer.feature,
			expiresAt: offer.availableUntil,
			offerCode: offer.code
		},
		{ transaction }
	);
	return { offer, grant, created: true, claimedAt };
}

function assertOfferOpen(offer: NormalizedGiftOffer, now: Date) {
	if (isGiftOfferScheduled(offer, now))
		throw premiumAccessServiceError.giftOfferNotFound();
	if (!isGiftOfferAvailable(offer, now))
		throw premiumAccessServiceError.giftOfferNotEligible();
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
	offerCode: string,
	transaction: Transaction
): Promise<NormalizedGiftOffer> {
	const promotion = await PremiumPromotion.findOne({
		where: { code: offerCode },
		transaction,
		lock: transaction.LOCK.SHARE
	});
	if (!promotion) throw premiumAccessServiceError.giftOfferNotFound();
	return normalizePromotion(promotion);
}

async function describeClaim(
	user: PremiumAccessUser,
	offer: NormalizedGiftOffer,
	grant: PremiumGrant,
	created: boolean,
	evaluatedAt: Date
): Promise<GiftOfferClaim> {
	const access = await resolvePremiumAccess(user, offer.feature, evaluatedAt);
	return {
		state: { offer, grant, hasAccess: access.allowed, evaluatedAt },
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
