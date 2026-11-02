import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as giftOffersController from "./gift-offers.controller";
import {
	ClaimGiftOfferSchema,
	GiftOfferParamsSchema
} from "./schemas/gift-offer.schemas";

const router = Router();
const giftOfferMiddleware = [
	rateLimiterMiddleware(userLimiter),
	authMiddleware()
];

router.get(
	"/users/me/gift-offers",
	giftOfferMiddleware,
	giftOffersController.getGiftOffers
);
router.post(
	"/users/me/gift-offers/:offerCode/claim",
	[
		...giftOfferMiddleware,
		validateSchemaMiddleware(GiftOfferParamsSchema, "params"),
		validateSchemaMiddleware(ClaimGiftOfferSchema, "body")
	],
	giftOffersController.postClaimGiftOffer
);

export default router;
