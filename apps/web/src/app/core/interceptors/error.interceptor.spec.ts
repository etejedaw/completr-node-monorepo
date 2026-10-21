import {
	HttpClient,
	HttpContext,
	type HttpErrorResponse,
	provideHttpClient,
	withInterceptors
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";

import { SUPPRESS_VALIDATION_TOAST } from "../../shared/utils/validation-errors";
import { AuthService } from "../services/auth";
import { ToastService } from "../services/toast";
import { errorInterceptor } from "./error.interceptor";

describe("errorInterceptor", () => {
	let http: HttpClient;
	let httpTesting: HttpTestingController;
	let token: string | null;
	let refresh$: Subject<unknown>;
	const auth = {
		token: () => token,
		refresh: vi.fn(),
		clearSession: vi.fn()
	};
	const toast = { warning: vi.fn(), premium: vi.fn() };

	beforeEach(() => {
		token = "old-token";
		refresh$ = new Subject();
		auth.refresh.mockReset().mockReturnValue(refresh$);
		auth.clearSession.mockReset();
		toast.warning.mockReset();
		toast.premium.mockReset();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: auth },
				{ provide: ToastService, useValue: toast }
			]
		});
		http = TestBed.inject(HttpClient);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	function failWith(
		status: number,
		body: object | null = null,
		context?: HttpContext
	) {
		const onError = vi.fn<(error: HttpErrorResponse) => void>();
		http.get("/api/thing", { context }).subscribe({ error: onError });
		httpTesting
			.expectOne("/api/thing")
			.flush(body, { status, statusText: "err" });
		return onError;
	}

	it("lets successful responses through untouched", () => {
		const onNext = vi.fn();

		http.get("/api/thing").subscribe(onNext);
		httpTesting.expectOne("/api/thing").flush({ ok: true });

		expect(onNext).toHaveBeenCalledWith({ ok: true });
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("warns with the problem detail on a 409 and rethrows", () => {
		const onError = failWith(409, { detail: "Already in backlog" });

		expect(toast.warning).toHaveBeenCalledWith("Already in backlog");
		expect(onError.mock.calls[0][0].status).toBe(409);
	});

	it("falls back to the title and then to a generic message on a 409", () => {
		failWith(409, { title: "Conflict title" });
		failWith(409, {});

		expect(toast.warning).toHaveBeenNthCalledWith(1, "Conflict title");
		expect(toast.warning).toHaveBeenNthCalledWith(
			2,
			"This action was already performed. Please refresh and try again."
		);
	});

	it("shows a premium toast with the plan limit message on a 402", () => {
		const onError = failWith(402, { type: "LIST_LIMIT_REACHED" });

		expect(toast.premium).toHaveBeenCalledWith(
			"Free plan limit",
			expect.stringContaining("free limit for lists"),
			6000
		);
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("shows no toast on a 402 with an unknown limit type", () => {
		const onError = failWith(402, { type: "SOMETHING_ELSE" });

		expect(toast.premium).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("warns about rate limiting on a 429", () => {
		const onError = failWith(429);

		expect(toast.warning).toHaveBeenCalledWith(
			"Too many requests. Please wait a moment and try again."
		);
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("summarizes server validation issues on a 422", () => {
		failWith(422, {
			type: "COMMON_SCHEMA_INVALID",
			issues: [
				{ path: "a", code: "x", message: "A is required" },
				{ path: "b", code: "y", message: "B is too short" }
			]
		});

		expect(toast.warning).toHaveBeenCalledWith(
			"A is required · B is too short"
		);
	});

	it("skips the 422 toast when the request suppresses it", () => {
		const context = new HttpContext().set(SUPPRESS_VALIDATION_TOAST, true);

		const onError = failWith(
			422,
			{
				type: "COMMON_SCHEMA_INVALID",
				issues: [{ path: "a", code: "x", message: "A is required" }]
			},
			context
		);

		expect(toast.warning).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("skips the 422 toast when the body has no validation issues", () => {
		failWith(422, { type: "OTHER" });

		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("rethrows other statuses without toasts or refresh", () => {
		const onError = failWith(500);

		expect(onError.mock.calls[0][0].status).toBe(500);
		expect(toast.warning).not.toHaveBeenCalled();
		expect(auth.refresh).not.toHaveBeenCalled();
	});

	it.each(["/auth/login", "/auth/refresh"])(
		"does not refresh when %s itself returns 401",
		path => {
			const onError = vi.fn();

			http.post(`/api${path}`, {}).subscribe({ error: onError });
			httpTesting
				.expectOne(`/api${path}`)
				.flush(null, { status: 401, statusText: "Unauthorized" });

			expect(auth.refresh).not.toHaveBeenCalled();
			expect(onError).toHaveBeenCalledTimes(1);
		}
	);

	it("refreshes the session on a 401 and retries with the new token", () => {
		const onNext = vi.fn();

		http.get("/api/thing").subscribe(onNext);
		httpTesting
			.expectOne("/api/thing")
			.flush(null, { status: 401, statusText: "Unauthorized" });
		expect(auth.refresh).toHaveBeenCalledTimes(1);

		token = "new-token";
		refresh$.next({});
		refresh$.complete();

		const retry = httpTesting.expectOne("/api/thing");
		expect(retry.request.headers.get("Authorization")).toBe(
			"Bearer new-token"
		);
		retry.flush({ ok: true });
		expect(onNext).toHaveBeenCalledWith({ ok: true });
		expect(auth.clearSession).not.toHaveBeenCalled();
	});

	it("clears the session and rethrows when the refresh fails", () => {
		const onError = vi.fn();

		http.get("/api/thing").subscribe({ error: onError });
		httpTesting
			.expectOne("/api/thing")
			.flush(null, { status: 401, statusText: "Unauthorized" });

		refresh$.error(new Error("refresh failed"));

		expect(auth.clearSession).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("refreshes once for concurrent 401s and retries both requests", () => {
		const onFirst = vi.fn();
		const onSecond = vi.fn();

		http.get("/api/first").subscribe(onFirst);
		http.get("/api/second").subscribe(onSecond);
		httpTesting
			.expectOne("/api/first")
			.flush(null, { status: 401, statusText: "Unauthorized" });
		httpTesting
			.expectOne("/api/second")
			.flush(null, { status: 401, statusText: "Unauthorized" });
		expect(auth.refresh).toHaveBeenCalledTimes(1);

		token = "fresh";
		refresh$.next({});
		refresh$.complete();

		const retries = ["/api/first", "/api/second"].map(url =>
			httpTesting.expectOne(url)
		);
		retries.forEach(retry => {
			expect(retry.request.headers.get("Authorization")).toBe(
				"Bearer fresh"
			);
			retry.flush({});
		});
		expect(onFirst).toHaveBeenCalledTimes(1);
		expect(onSecond).toHaveBeenCalledTimes(1);
	});

	it.todo(
		"completes or errors requests queued behind a refresh that fails (they stay pending forever today)"
	);
});
