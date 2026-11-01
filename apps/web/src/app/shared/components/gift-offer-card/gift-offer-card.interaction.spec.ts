import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { GiftOfferCard } from "./gift-offer-card";
import { type GiftOffer, type GiftOfferClaim } from "./gift-offer-card.model";
import { GiftOffersService } from "./gift-offers.service";

function makeOffer(overrides: Partial<GiftOffer> = {}): GiftOffer {
	return {
		code: "json-export-trial-1m",
		feature: "export.json",
		durationDays: 30,
		availableFrom: null,
		availableUntil: null,
		status: "available",
		expiresAt: null,
		canActivate: true,
		hasAccess: false,
		...overrides
	};
}

const ACTIVE_OFFER = makeOffer({
	status: "active",
	canActivate: false,
	hasAccess: true,
	expiresAt: "2026-12-01T00:00:00.000Z"
});

function claimOf(
	overrides: Partial<GiftOffer> = {},
	created = true
): GiftOfferClaim {
	return { offer: { ...ACTIVE_OFFER, ...overrides }, created };
}

describe("GiftOfferCard interaction", () => {
	const giftOffers = {
		listOffers: vi.fn(),
		claimOffer: vi.fn()
	};
	const auth = { loadUser: vi.fn(() => of({})) };

	beforeEach(() => {
		giftOffers.listOffers.mockReset();
		giftOffers.claimOffer.mockReset();
		giftOffers.listOffers.mockReturnValue(of([makeOffer()]));
		giftOffers.claimOffer.mockReturnValue(of(claimOf()));
		auth.loadUser.mockReset();
		auth.loadUser.mockReturnValue(of({}));
	});

	function providers() {
		return [
			{ provide: GiftOffersService, useValue: giftOffers },
			{ provide: AuthService, useValue: auth }
		];
	}

	it("activates an available trial once and shows its expiration", async () => {
		const user = userEvent.setup();
		await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		const button = await screen.findByRole("button", {
			name: "Activate trial"
		});
		await user.dblClick(button);
		expect(giftOffers.claimOffer).toHaveBeenCalledTimes(1);
		expect(await screen.findByText("Trial active")).toBeInTheDocument();
		expect(screen.getByText(/Active until/)).toBeInTheDocument();
	});

	it("locks the button while activation is pending", async () => {
		const pending = new Subject<GiftOfferClaim>();
		giftOffers.claimOffer.mockReturnValue(pending);
		await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		const button = await screen.findByRole("button", {
			name: "Activate trial"
		});
		await userEvent.click(button);
		expect(
			screen.getByRole("button", { name: "Activating..." })
		).toBeDisabled();
		pending.next(claimOf());
		pending.complete();
	});

	it("refreshes the user after claiming full premium", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([
				makeOffer({
					code: "premium-trial-1m",
					feature: "*"
				})
			])
		);
		giftOffers.claimOffer.mockReturnValue(
			of(claimOf({ code: "premium-trial-1m", feature: "*" }))
		);
		await render(GiftOfferCard, {
			inputs: { offerCode: "premium-trial-1m" },
			providers: providers()
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(auth.loadUser).toHaveBeenCalledTimes(1);
	});

	it("shows a retryable activation error", async () => {
		giftOffers.claimOffer.mockReturnValue(
			throwError(() => ({ error: { title: "Not eligible" } }))
		);
		await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Not eligible"
		);
		expect(
			screen.getByRole("button", { name: "Activate trial" })
		).toBeEnabled();
	});

	it("hides an offer that is not eligible", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([
				makeOffer({
					status: "not-eligible",
					canActivate: false,
					hasAccess: true
				})
			])
		);
		const { container } = await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		expect(container.querySelector("article")).not.toBeInTheDocument();
	});

	it("shows loading and load-error states with retry", async () => {
		const pending = new Subject<GiftOffer[]>();
		giftOffers.listOffers.mockReturnValueOnce(pending);
		await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		expect(document.querySelector("ui-skeleton")).toBeInTheDocument();
		pending.error(new Error("network"));
		expect(
			await screen.findByText("Could not load this trial.")
		).toBeInTheDocument();
		giftOffers.listOffers.mockReturnValueOnce(
			of([makeOffer({ status: "used", canActivate: false })])
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Try again" })
		);
		expect(
			await screen.findByText("Trial already used")
		).toBeInTheDocument();
	});

	it("emits the claimed offer only when it comes back active", async () => {
		const { fixture } = await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		const emitted: GiftOffer[] = [];
		fixture.componentInstance.claimed.subscribe(value =>
			emitted.push(value)
		);
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(emitted).toEqual([ACTIVE_OFFER]);
	});

	it("reloads the listing instead of marking active when the claim returns a used offer", async () => {
		giftOffers.claimOffer.mockReturnValue(
			of(
				claimOf(
					{
						status: "used",
						hasAccess: false,
						expiresAt: "2020-01-01T00:00:00.000Z"
					},
					false
				)
			)
		);
		giftOffers.listOffers
			.mockReturnValueOnce(of([makeOffer()]))
			.mockReturnValueOnce(
				of([makeOffer({ status: "used", canActivate: false })])
			);
		const { fixture } = await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		const emitted: GiftOffer[] = [];
		fixture.componentInstance.claimed.subscribe(value =>
			emitted.push(value)
		);
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(
			await screen.findByText("Trial already used")
		).toBeInTheDocument();
		expect(screen.queryByText("Trial active")).not.toBeInTheDocument();
		expect(giftOffers.listOffers).toHaveBeenCalledTimes(2);
		expect(emitted).toEqual([]);
		expect(auth.loadUser).not.toHaveBeenCalled();
	});

	it("does not refresh the user when a full premium claim comes back inactive", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([makeOffer({ code: "premium-trial-1m", feature: "*" })])
		);
		giftOffers.claimOffer.mockReturnValue(
			of(
				claimOf(
					{
						code: "premium-trial-1m",
						feature: "*",
						status: "used",
						hasAccess: false
					},
					false
				)
			)
		);
		await render(GiftOfferCard, {
			inputs: { offerCode: "premium-trial-1m" },
			providers: providers()
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(auth.loadUser).not.toHaveBeenCalled();
	});

	it("keeps the trial active when refreshing the user fails after a successful claim", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([makeOffer({ code: "premium-trial-1m", feature: "*" })])
		);
		giftOffers.claimOffer.mockReturnValue(
			of(claimOf({ code: "premium-trial-1m", feature: "*" }))
		);
		auth.loadUser.mockReturnValue(throwError(() => new Error("offline")));
		await render(GiftOfferCard, {
			inputs: { offerCode: "premium-trial-1m" },
			providers: providers()
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(await screen.findByText("Trial active")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("retries after a server error and activates on the second attempt", async () => {
		giftOffers.claimOffer
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(claimOf()));
		await render(GiftOfferCard, {
			inputs: { offerCode: "json-export-trial-1m" },
			providers: providers()
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Activate trial" })
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not activate the trial. Try again."
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Activate trial" })
		);
		expect(await screen.findByText("Trial active")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("titles a fixed-date promotion without a duration", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([
				makeOffer({
					code: "lists-gift",
					feature: "lists.unlimited",
					durationDays: null,
					availableFrom: "2026-11-01T00:00:00.000Z",
					availableUntil: "2026-12-01T00:00:00.000Z"
				})
			])
		);
		await render(GiftOfferCard, {
			inputs: { offerCode: "lists-gift" },
			providers: providers()
		});
		expect(
			await screen.findByText("Claim your Premium gift")
		).toBeInTheDocument();
	});
});
