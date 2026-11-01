import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { filter, map, type Observable, shareReplay, tap } from "rxjs";

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
	private cachedOffers: Observable<GiftOffer[]> | null = null;

	constructor() {
		inject(Router)
			.events.pipe(filter(event => event instanceof NavigationStart))
			.subscribe(() => this.invalidate());
	}

	listOffers(): Observable<GiftOffer[]> {
		if (this.cachedOffers) return this.cachedOffers;
		const offers$: Observable<GiftOffer[]> = this.http
			.get<{ data: { offers: GiftOffer[] } }>(
				`${environment.apiUrl}/users/me/gift-offers`
			)
			.pipe(
				map(res => res.data.offers),
				tap({ error: () => this.forget(offers$) }),
				shareReplay({ bufferSize: 1, refCount: false })
			);
		this.cachedOffers = offers$;
		return offers$;
	}

	claimOffer(code: string) {
		return this.http
			.post<{ data: GiftOfferClaim }>(
				`${environment.apiUrl}/users/me/gift-offers/${encodeURIComponent(code)}/claim`,
				{},
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(
				tap({
					next: () => this.invalidate(),
					error: () => this.invalidate()
				}),
				map(res => res.data)
			);
	}

	invalidate() {
		this.cachedOffers = null;
	}

	private forget(offers$: Observable<GiftOffer[]>) {
		if (this.cachedOffers === offers$) this.cachedOffers = null;
	}
}
