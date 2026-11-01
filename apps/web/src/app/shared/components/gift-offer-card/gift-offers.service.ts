import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../utils/validation-errors";
import { type GiftOffer, type GiftOfferClaim } from "./gift-offer-card.model";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

@Injectable({ providedIn: "root" })
export class GiftOffersService {
	private readonly http = inject(HttpClient);

	listOffers() {
		return this.http
			.get<{ data: { offers: GiftOffer[] } }>(
				`${environment.apiUrl}/users/me/gift-offers`
			)
			.pipe(map(res => res.data.offers));
	}

	claimOffer(offerCode: string) {
		return this.http
			.post<{ data: GiftOfferClaim }>(
				`${environment.apiUrl}/users/me/gift-offers/${offerCode}/claim`,
				{},
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data));
	}
}
