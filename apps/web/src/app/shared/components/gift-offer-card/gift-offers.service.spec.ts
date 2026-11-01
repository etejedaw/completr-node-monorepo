import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../utils/validation-errors";
import { GiftOffersService } from "./gift-offers.service";

describe("GiftOffersService", () => {
	let service: GiftOffersService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GiftOffersService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it("lists the offers", () => {
		let result: unknown;
		service.listOffers().subscribe(value => (result = value));
		http.expectOne(`${environment.apiUrl}/users/me/gift-offers`).flush({
			data: { offers: [{ code: "premium-trial-1m" }] }
		});
		expect(result).toEqual([{ code: "premium-trial-1m" }]);
	});

	it("claims an offer with an empty body", () => {
		let result: unknown;
		service
			.claimOffer("json-export-trial-1m")
			.subscribe(value => (result = value));
		const req = http.expectOne(
			`${environment.apiUrl}/users/me/gift-offers/json-export-trial-1m/claim`
		);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({});
		expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(true);
		req.flush({
			data: { offer: { code: "json-export-trial-1m" }, created: true }
		});
		expect(result).toEqual({
			offer: { code: "json-export-trial-1m" },
			created: true
		});
	});
});
