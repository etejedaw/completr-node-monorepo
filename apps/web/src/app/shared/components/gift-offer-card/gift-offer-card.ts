import { DatePipe } from "@angular/common";
import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	input,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
	catchError,
	map,
	of,
	Subject,
	type Subscription,
	switchMap
} from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { UiButton } from "../../ui";
import { type GiftOffer, type GiftOfferFeature } from "./gift-offer-card.model";
import { GIFT_OFFER_COPY } from "./gift-offer-copy";
import { giftOfferEndsAt, selectGiftOffer } from "./gift-offer-selection";
import { GiftOffersService } from "./gift-offers.service";

const LONGEST_TIMER_MS = 2_147_483_647;
const STATUSES_THAT_RELOAD_AFTER_CLAIM_ERROR = new Set([404, 409, 410]);

let nextGiftOfferCardId = 0;

@Component({
	selector: "app-gift-offer-card",
	imports: [DatePipe, UiButton],
	templateUrl: "./gift-offer-card.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GiftOfferCard {
	readonly feature = input.required<GiftOfferFeature>();
	readonly variant = input<"card" | "compact">("card");
	readonly claimed = output<GiftOffer>();
	readonly expired = output<GiftOffer>();

	private readonly giftOffersService = inject(GiftOffersService);
	private readonly auth = inject(AuthService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly reloadRequests = new Subject<void>();
	private claimSubscription: Subscription | null = null;

	private readonly offers = signal<readonly GiftOffer[]>([]);
	private readonly now = signal(Date.now());
	protected readonly isClaiming = signal(false);
	protected readonly claimError = signal("");
	protected readonly titleId = `gift-offer-title-${nextGiftOfferCardId++}`;
	protected readonly dateFormat = "MMM d, y, h:mm a";

	protected readonly offer = computed(() =>
		selectGiftOffer(this.offers(), this.feature(), this.now())
	);
	protected readonly copy = computed(() => GIFT_OFFER_COPY[this.feature()]);

	constructor() {
		this.reloadRequests
			.pipe(
				switchMap(() =>
					this.giftOffersService
						.listOffers()
						.pipe(catchError(() => of<GiftOffer[]>([])))
				),
				takeUntilDestroyed()
			)
			.subscribe(offers => {
				this.now.set(Date.now());
				this.offers.set(offers);
			});
		this.reload();
		effect(onCleanup => {
			const offer = this.offer();
			if (!offer) return;
			const remaining = giftOfferEndsAt(offer) - Date.now();
			if (remaining > LONGEST_TIMER_MS) return;
			const timer = setTimeout(
				() => this.reachEnd(offer),
				Math.max(remaining, 0)
			);
			onCleanup(() => clearTimeout(timer));
		});
		this.destroyRef.onDestroy(() => this.claimSubscription?.unsubscribe());
	}

	protected claim() {
		const offer = this.offer();
		if (!offer?.canActivate || offer.status !== "available") return;
		if (this.isClaiming()) return;
		this.isClaiming.set(true);
		this.claimError.set("");
		this.claimSubscription = this.giftOffersService
			.claimOffer(offer.code)
			.pipe(
				switchMap(result =>
					result.offer.status === "active"
						? this.auth.loadUser().pipe(
								map(() => result),
								catchError(() => of(result))
							)
						: of(result)
				)
			)
			.subscribe({
				next: ({ offer: claimedOffer }) => {
					this.isClaiming.set(false);
					if (claimedOffer.status !== "active") {
						this.reload();
						return;
					}
					this.replaceOffer(claimedOffer);
					this.claimed.emit(claimedOffer);
				},
				error: (error: HttpErrorResponse) => {
					this.isClaiming.set(false);
					this.claimError.set(
						error.error?.title ??
							"Could not activate the gift. Try again."
					);
					if (
						STATUSES_THAT_RELOAD_AFTER_CLAIM_ERROR.has(error.status)
					)
						this.reload();
				}
			});
	}

	protected activeUntil(offer: GiftOffer): string {
		return offer.expiresAt ?? offer.availableUntil;
	}

	private reachEnd(offer: GiftOffer) {
		this.now.set(Date.now());
		if (offer.status !== "active") return;
		this.auth
			.loadUser()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(() => this.expired.emit(offer));
	}

	private reload() {
		this.reloadRequests.next();
	}

	private replaceOffer(claimedOffer: GiftOffer) {
		this.now.set(Date.now());
		this.offers.update(offers => [
			claimedOffer,
			...offers.filter(offer => offer.code !== claimedOffer.code)
		]);
	}
}
