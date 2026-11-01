import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as giftOffersService from "./gift-offers.service";
import { type GiftOfferParams } from "./schemas/gift-offer.schemas";

export async function getGiftOffers(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const offers = await giftOffersService.listGiftOffers(user);
	return response.status(200).json({ data: { offers } });
}

export async function postClaimGiftOffer(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { offerCode } = request.locals.params as GiftOfferParams;
	const { offer, created } = await giftOffersService.claimGiftOffer(
		user,
		offerCode
	);
	return response
		.status(created ? 201 : 200)
		.json({ data: { offer, created } });
}
