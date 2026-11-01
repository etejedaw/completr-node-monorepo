import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { map, switchMap } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { UiAlert, UiButton, UiSkeleton } from "../../ui";
import { type GiftOffer, type GiftOfferGrant } from "./gift-offer-card.model";
import { GiftOffersService } from "./gift-offers.service";

const OFFER_COPY: Record<string, { title: string; description: string }> = {
	"json-export-trial-1m": {
		title: "Try JSON export for 1 month",
		description:
			"Download a complete, portable copy of this collection as JSON."
	},
	"premium-trial-1m": {
		title: "Try Premium for 1 month",
		description:
			"Explore every Premium feature with no change to your account role."
	}
};

@Component({
	selector: "app-gift-offer-card",
	imports: [DatePipe, UiAlert, UiButton, UiSkeleton],
	templateUrl: "./gift-offer-card.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GiftOfferCard implements OnInit {
	readonly offerCode = input.required<string>();
	readonly variant = input<"card" | "compact">("card");
	readonly claimed = output<GiftOfferGrant>();

	private readonly giftOffersService = inject(GiftOffersService);
	private readonly auth = inject(AuthService);

	protected readonly offer = signal<GiftOffer | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly isClaiming = signal(false);
	protected readonly loadError = signal(false);
	protected readonly claimError = signal("");

	ngOnInit() {
		this.load();
	}

	protected load() {
		this.isLoading.set(true);
		this.loadError.set(false);
		this.giftOffersService.listOffers().subscribe({
			next: offers => {
				this.offer.set(
					offers.find(offer => offer.code === this.offerCode()) ??
						null
				);
				this.isLoading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.isLoading.set(false);
			}
		});
	}

	protected claim() {
		const offer = this.offer();
		if (!offer?.canActivate || this.isClaiming()) return;
		this.isClaiming.set(true);
		this.claimError.set("");
		this.giftOffersService
			.claimOffer(offer.code)
			.pipe(
				switchMap(result =>
					result.grant.feature === "*"
						? this.auth.loadUser().pipe(map(() => result))
						: [result]
				)
			)
			.subscribe({
				next: result => {
					this.offer.set({
						...offer,
						status: "active",
						expiresAt: result.grant.expiresAt,
						canActivate: false,
						hasAccess: true
					});
					this.isClaiming.set(false);
					this.claimed.emit(result.grant);
				},
				error: error => {
					this.claimError.set(
						error.error?.title ??
							"Could not activate the trial. Try again."
					);
					this.isClaiming.set(false);
				}
			});
	}

	protected copy() {
		return (
			OFFER_COPY[this.offerCode()] ?? {
				title: `Try this Premium feature for ${this.offer()?.durationDays ?? 30} days`,
				description: "Activate a limited-time Premium feature trial."
			}
		);
	}
}
