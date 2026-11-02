import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { GiftOfferCard } from "./gift-offer-card";
import {
	type GiftOffer,
	type GiftOfferClaim,
	type GiftOfferFeature
} from "./gift-offer-card.model";
import { GiftOffersService } from "./gift-offers.service";

const IN_A_MONTH = new Date(Date.now() + 30 * 86_400_000).toISOString();
const IN_TWO_MONTHS = new Date(Date.now() + 60 * 86_400_000).toISOString();
const LAST_WEEK = new Date(Date.now() - 7 * 86_400_000).toISOString();

function makeOffer(overrides: Partial<GiftOffer> = {}): GiftOffer {
	return {
		code: "json-launch",
		feature: "export.json",
		availableFrom: LAST_WEEK,
		availableUntil: IN_A_MONTH,
		status: "available",
		expiresAt: null,
		canActivate: true,
		hasAccess: false,
		...overrides
	};
}

function activeOf(offer: GiftOffer): GiftOffer {
	return {
		...offer,
		status: "active",
		canActivate: false,
		hasAccess: true,
		expiresAt: offer.availableUntil
	};
}

function claimOf(offer: GiftOffer, created = true): GiftOfferClaim {
	return { offer, created };
}

describe("GiftOfferCard interaction", () => {
	const giftOffers = {
		listOffers: vi.fn(),
		claimOffer: vi.fn()
	};
	const auth = { loadUser: vi.fn() };

	beforeEach(() => {
		giftOffers.listOffers.mockReset();
		giftOffers.claimOffer.mockReset();
		giftOffers.listOffers.mockReturnValue(of([makeOffer()]));
		giftOffers.claimOffer.mockReturnValue(
			of(claimOf(activeOf(makeOffer())))
		);
		auth.loadUser.mockReset();
		auth.loadUser.mockReturnValue(of({}));
	});

	async function renderCard(
		feature: GiftOfferFeature = "export.json",
		variant: "card" | "compact" = "card"
	) {
		const result = await render(GiftOfferCard, {
			inputs: { feature, variant },
			providers: [
				{ provide: GiftOffersService, useValue: giftOffers },
				{ provide: AuthService, useValue: auth }
			]
		});
		const emitted: GiftOffer[] = [];
		result.fixture.componentInstance.claimed.subscribe(value =>
			emitted.push(value)
		);
		return { ...result, emitted };
	}

	function activateButton() {
		return screen.findByRole("button", { name: "Activate gift" });
	}

	it("shows the gift of its feature with the exact end date", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([
				makeOffer({ code: "lists-launch", feature: "lists.unlimited" }),
				makeOffer()
			])
		);
		await renderCard();

		expect(
			await screen.findByRole("heading", { name: "JSON export, on us" })
		).toBeInTheDocument();
		expect(screen.getByText(/Available until/)).toHaveTextContent(
			/Available until \w{3} \d{1,2}, \d{4}/
		);
		expect(await activateButton()).toBeEnabled();
	});

	it("titles the full Premium gift for the * feature", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([makeOffer({ code: "premium-week", feature: "*" })])
		);
		await renderCard("*");

		expect(
			await screen.findByRole("heading", { name: "Premium, on us" })
		).toBeInTheDocument();
	});

	it("prefers an active gift over an available one of the same feature", async () => {
		giftOffers.listOffers.mockReturnValue(
			of([
				makeOffer({ code: "a-available" }),
				activeOf(makeOffer({ code: "z-active" }))
			])
		);
		await renderCard();

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Activate gift" })
		).not.toBeInTheDocument();
	});

	it("picks the same available gift whatever order the API sends", async () => {
		const sooner = makeOffer({ code: "b-sooner" });
		const later = makeOffer({
			code: "c-later",
			availableUntil: IN_TWO_MONTHS
		});
		const tied = makeOffer({
			code: "a-tied",
			availableUntil: IN_TWO_MONTHS
		});
		giftOffers.listOffers.mockReturnValue(of([sooner, later, tied]));
		await renderCard();

		await userEvent.click(await activateButton());

		expect(giftOffers.claimOffer).toHaveBeenCalledWith("a-tied");
	});

	it.each([
		["used", makeOffer({ status: "used", canActivate: false })],
		["expired", makeOffer({ status: "expired", canActivate: false })],
		[
			"not eligible",
			makeOffer({
				status: "not-eligible",
				canActivate: false,
				hasAccess: true
			})
		],
		["past its end date", makeOffer({ availableUntil: LAST_WEEK })],
		["with a garbage end date", makeOffer({ availableUntil: "soon" })],
		["of another feature", makeOffer({ feature: "lists.unlimited" })]
	])("renders nothing for an offer %s", async (_label, offer) => {
		giftOffers.listOffers.mockReturnValue(of([offer]));
		const { container } = await renderCard();

		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing while loading and stays silent when loading fails", async () => {
		const pending = new Subject<GiftOffer[]>();
		giftOffers.listOffers.mockReturnValue(pending);
		const { container, fixture } = await renderCard();

		expect(container).toBeEmptyDOMElement();
		pending.error(new Error("network"));
		fixture.detectChanges();

		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("activates once on a double click and then shows only the active line", async () => {
		const user = userEvent.setup();
		const { emitted } = await renderCard();

		await user.dblClick(await activateButton());

		expect(giftOffers.claimOffer).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(screen.queryByRole("article")).not.toBeInTheDocument();
		expect(emitted).toEqual([activeOf(makeOffer())]);
	});

	it("locks the button while activation is pending", async () => {
		const pending = new Subject<GiftOfferClaim>();
		giftOffers.claimOffer.mockReturnValue(pending);
		await renderCard("export.json", "compact");

		await userEvent.click(await activateButton());
		const busy = screen.getByRole("button", { name: "Activating..." });
		await userEvent.click(busy);

		expect(busy).toBeDisabled();
		expect(busy).toHaveAttribute("aria-busy", "true");
		expect(giftOffers.claimOffer).toHaveBeenCalledTimes(1);
		pending.next(claimOf(activeOf(makeOffer())));
		pending.complete();
		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
	});

	it("refreshes the user before announcing the claim", async () => {
		const reloadedUser = new Subject<unknown>();
		auth.loadUser.mockReturnValue(reloadedUser);
		const { emitted } = await renderCard();

		await userEvent.click(await activateButton());

		expect(auth.loadUser).toHaveBeenCalledTimes(1);
		expect(emitted).toEqual([]);
		reloadedUser.next({});
		reloadedUser.complete();
		await waitFor(() => expect(emitted).toHaveLength(1));
	});

	it("keeps the gift active when refreshing the user fails after a full Premium claim", async () => {
		const premium = makeOffer({ code: "premium-week", feature: "*" });
		giftOffers.listOffers.mockReturnValue(of([premium]));
		giftOffers.claimOffer.mockReturnValue(of(claimOf(activeOf(premium))));
		auth.loadUser.mockReturnValue(throwError(() => new Error("offline")));
		const { emitted } = await renderCard("*");

		await userEvent.click(await activateButton());

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(emitted).toHaveLength(1);
	});

	it("shows a retryable error and activates on the second attempt", async () => {
		giftOffers.claimOffer
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(claimOf(activeOf(makeOffer()))));
		await renderCard();

		await userEvent.click(await activateButton());
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not activate the gift. Try again."
		);
		await userEvent.click(await activateButton());

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(giftOffers.listOffers).toHaveBeenCalledTimes(1);
	});

	it("reloads instead of marking active when the promotion was revoked after listing", async () => {
		giftOffers.claimOffer.mockReturnValue(
			of(
				claimOf(
					makeOffer({
						status: "expired",
						canActivate: false,
						expiresAt: LAST_WEEK
					}),
					false
				)
			)
		);
		giftOffers.listOffers
			.mockReturnValueOnce(of([makeOffer()]))
			.mockReturnValueOnce(
				of([makeOffer({ status: "expired", canActivate: false })])
			);
		const { container, emitted } = await renderCard();

		await userEvent.click(await activateButton());

		await waitFor(() => expect(container).toBeEmptyDOMElement());
		expect(giftOffers.listOffers).toHaveBeenCalledTimes(2);
		expect(emitted).toEqual([]);
		expect(auth.loadUser).not.toHaveBeenCalled();
	});

	it("reloads after a not-found claim and hides the gift that no longer exists", async () => {
		giftOffers.claimOffer.mockReturnValue(
			throwError(() => ({
				status: 404,
				error: { title: "Gift offer not found" }
			}))
		);
		giftOffers.listOffers
			.mockReturnValueOnce(of([makeOffer()]))
			.mockReturnValueOnce(of([]));
		const { container, emitted } = await renderCard();

		await userEvent.click(await activateButton());

		await waitFor(() => expect(container).toBeEmptyDOMElement());
		expect(emitted).toEqual([]);
	});

	it("ignores a claim that resolves after the card was closed", async () => {
		const pending = new Subject<GiftOfferClaim>();
		giftOffers.claimOffer.mockReturnValue(pending);
		const { fixture, emitted } = await renderCard();

		await userEvent.click(await activateButton());
		fixture.destroy();
		pending.next(claimOf(activeOf(makeOffer())));
		pending.complete();

		expect(auth.loadUser).not.toHaveBeenCalled();
		expect(emitted).toEqual([]);
	});

	async function untilEnd(offer: GiftOffer) {
		giftOffers.listOffers.mockReturnValue(of([offer]));
		const result = await renderCard();
		const expired: GiftOffer[] = [];
		result.fixture.componentInstance.expired.subscribe(value =>
			expired.push(value)
		);
		return { ...result, expired };
	}

	function endsInAMinute() {
		return new Date(Date.now() + 60_000).toISOString();
	}

	it("hides an active gift and refreshes the user when it ends while the card is open", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const offer = activeOf(
				makeOffer({ availableUntil: endsInAMinute() })
			);
			const { container, fixture, expired } = await untilEnd(offer);
			expect(screen.getByText(/Gift active until/)).toBeInTheDocument();
			expect(auth.loadUser).not.toHaveBeenCalled();

			vi.advanceTimersByTime(59_000);
			fixture.detectChanges();
			expect(screen.getByText(/Gift active until/)).toBeInTheDocument();
			expect(auth.loadUser).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1_000);
			fixture.detectChanges();

			expect(container).toBeEmptyDOMElement();
			expect(auth.loadUser).toHaveBeenCalledTimes(1);
			expect(expired).toEqual([offer]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("still announces the end of an active gift when refreshing the user fails", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			auth.loadUser.mockReturnValue(
				throwError(() => new Error("offline"))
			);
			const offer = activeOf(
				makeOffer({ availableUntil: endsInAMinute() })
			);
			const { container, fixture, expired } = await untilEnd(offer);

			vi.advanceTimersByTime(60_000);
			fixture.detectChanges();

			expect(container).toBeEmptyDOMElement();
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			expect(expired).toEqual([offer]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("hides an available gift at its end without refreshing the user", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const { container, fixture, expired } = await untilEnd(
				makeOffer({ availableUntil: endsInAMinute() })
			);
			expect(await activateButton()).toBeEnabled();

			vi.advanceTimersByTime(60_000);
			fixture.detectChanges();

			expect(container).toBeEmptyDOMElement();
			expect(auth.loadUser).not.toHaveBeenCalled();
			expect(expired).toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not refresh the user when the card closes before the gift ends", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const { fixture } = await untilEnd(
				activeOf(makeOffer({ availableUntil: endsInAMinute() }))
			);

			fixture.destroy();
			vi.advanceTimersByTime(60_000);

			expect(auth.loadUser).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});
