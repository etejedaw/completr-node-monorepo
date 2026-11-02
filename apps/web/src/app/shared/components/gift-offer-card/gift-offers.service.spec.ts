import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../utils/validation-errors";
import { GiftOffersService } from "./gift-offers.service";

const OFFERS_URL = `${environment.apiUrl}/users/me/gift-offers`;

describe("GiftOffersService", () => {
	let service: GiftOffersService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([{ path: "**", children: [] }])
			]
		});
		service = TestBed.inject(GiftOffersService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("lists the offers", () => {
		let result: unknown;
		service.listOffers().subscribe(value => (result = value));
		http.expectOne(OFFERS_URL).flush({
			data: { offers: [{ code: "lists-launch" }] }
		});
		expect(result).toEqual([{ code: "lists-launch" }]);
	});

	it("shares one request between every card of the view", () => {
		const results: unknown[] = [];
		service.listOffers().subscribe(value => results.push(value));
		service.listOffers().subscribe(value => results.push(value));
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });
		service.listOffers().subscribe(value => results.push(value));

		expect(results).toEqual([[], [], []]);
	});

	it("asks again after a failed request", () => {
		let failed = false;
		service.listOffers().subscribe({ error: () => (failed = true) });
		http.expectOne(OFFERS_URL).flush(null, {
			status: 500,
			statusText: "Server Error"
		});
		expect(failed).toBe(true);

		let result: unknown;
		service.listOffers().subscribe(value => (result = value));
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });
		expect(result).toEqual([]);
	});

	it("keeps a newer listing when an older one fails late", () => {
		service.listOffers().subscribe({ error: () => undefined });
		const stale = http.expectOne(OFFERS_URL);
		service.invalidate();
		service.listOffers().subscribe();
		const fresh = http.match(OFFERS_URL).find(req => req !== stale)!;
		fresh.flush({ data: { offers: [] } });
		stale.flush(null, { status: 500, statusText: "Server Error" });

		service.listOffers().subscribe();
		http.expectNone(OFFERS_URL);
	});

	it("asks again on the next navigation", async () => {
		service.listOffers().subscribe();
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });

		await TestBed.inject(Router).navigateByUrl("/lists");
		service.listOffers().subscribe();

		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });
	});

	it("claims an offer with an empty body and drops the cached listing", () => {
		service.listOffers().subscribe();
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });

		let result: unknown;
		service.claimOffer("lists-launch").subscribe(value => (result = value));
		const req = http.expectOne(`${OFFERS_URL}/lists-launch/claim`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({});
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		req.flush({
			data: { offer: { code: "lists-launch" }, created: true }
		});
		expect(result).toEqual({
			offer: { code: "lists-launch" },
			created: true
		});

		service.listOffers().subscribe();
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });
	});

	it("drops the cached listing when a claim fails", () => {
		service.listOffers().subscribe();
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });

		service.claimOffer("gone").subscribe({ error: () => undefined });
		http.expectOne(`${OFFERS_URL}/gone/claim`).flush(null, {
			status: 404,
			statusText: "Not Found"
		});

		service.listOffers().subscribe();
		http.expectOne(OFFERS_URL).flush({ data: { offers: [] } });
	});

	it("encodes the offer code in the claim URL", () => {
		service.claimOffer("a b/c").subscribe();
		http.expectOne(`${OFFERS_URL}/a%20b%2Fc/claim`).flush({
			data: { offer: {}, created: false }
		});
	});
});
