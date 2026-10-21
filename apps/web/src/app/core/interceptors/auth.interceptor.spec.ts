import {
	HttpClient,
	provideHttpClient,
	withInterceptors
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { AuthService } from "../services/auth";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
	let http: HttpClient;
	let httpTesting: HttpTestingController;
	let token: string | null;

	beforeEach(() => {
		token = null;
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { token: () => token } }
			]
		});
		http = TestBed.inject(HttpClient);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("adds the bearer token when there is a session", () => {
		token = "abc.def.ghi";

		http.get("/api/games").subscribe();

		const req = httpTesting.expectOne("/api/games");
		expect(req.request.headers.get("Authorization")).toBe(
			"Bearer abc.def.ghi"
		);
		req.flush({});
	});

	it("sends the request untouched when there is no token", () => {
		http.get("/api/games").subscribe();

		const req = httpTesting.expectOne("/api/games");
		expect(req.request.headers.has("Authorization")).toBe(false);
		req.flush({});
	});

	it("reads the token on every request so a renewed token is used", () => {
		token = "first";
		http.get("/api/a").subscribe();
		httpTesting.expectOne("/api/a").flush({});

		token = "second";
		http.get("/api/b").subscribe();

		const req = httpTesting.expectOne("/api/b");
		expect(req.request.headers.get("Authorization")).toBe("Bearer second");
		req.flush({});
	});

	it("keeps the headers the caller already set", () => {
		token = "t";

		http.get("/api/games", { headers: { "X-Custom": "1" } }).subscribe();

		const req = httpTesting.expectOne("/api/games");
		expect(req.request.headers.get("X-Custom")).toBe("1");
		expect(req.request.headers.get("Authorization")).toBe("Bearer t");
		req.flush({});
	});
});
