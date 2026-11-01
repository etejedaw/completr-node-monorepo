import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { GiftOfferCard } from "./gift-offer-card";
import { type GiftOffer, type GiftOfferGrant } from "./gift-offer-card.model";
import { GiftOffersService } from "./gift-offers.service";

function makeOffer(overrides: Partial<GiftOffer> = {}): GiftOffer {
	return {
		code: "json-export-trial-1m",
		feature: "export.json",
		durationDays: 30,
		status: "available",
		expiresAt: null,
		canActivate: true,
		hasAccess: false,
		...overrides
	};
}

const GRANT: GiftOfferGrant = {
	id: "g1",
	userId: "u1",
	feature: "export.json",
	expiresAt: "2026-12-01T00:00:00.000Z",
	offerCode: "json-export-trial-1m",
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z"
};

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
		giftOffers.claimOffer.mockReturnValue(
			of({ grant: GRANT, created: true })
		);
		auth.loadUser.mockClear();
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
		const pending = new Subject<{
			grant: GiftOfferGrant;
			created: boolean;
		}>();
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
		pending.next({ grant: GRANT, created: true });
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
			of({ grant: { ...GRANT, feature: "*" }, created: true })
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
});
