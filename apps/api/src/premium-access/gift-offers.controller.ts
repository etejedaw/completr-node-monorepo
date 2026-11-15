import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { giftOfferSerializer } from "./gift-offers.serializer";
import { type GiftOfferParams } from "./schemas/gift-offer-params.schema";
import * as giftOffersService from "./services/gift-offers.service";

export async function getGiftOffers(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const states = await giftOffersService.listGiftOffers(user);
	return response
		.status(200)
		.json({ data: { offers: states.map(giftOfferSerializer) } });
}

export async function postClaimGiftOffer(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { offerCode } = request.locals.params as GiftOfferParams;
	const { state, created } = await giftOffersService.claimGiftOffer(
		user,
		offerCode
	);
	return response
		.status(created ? 201 : 200)
		.json({ data: { offer: giftOfferSerializer(state), created } });
}
