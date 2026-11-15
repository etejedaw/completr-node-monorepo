import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { Subject, throwError } from "rxjs";

import { ToastService } from "../../core/services/toast";
import { injectToggleAction } from "./inject-toggle-action";

describe("injectToggleAction", () => {
	const toast = { error: vi.fn() };

	function setup() {
		toast.error.mockReset();
		TestBed.configureTestingModule({
			providers: [{ provide: ToastService, useValue: toast }]
		});
		return TestBed.runInInjectionContext(() => injectToggleAction());
	}

	const failure = (status: number) =>
		throwError(() => new HttpErrorResponse({ status }));

	it("ignores a second run for the same key while the first is pending", () => {
		const toggle = setup();
		const first = new Subject<void>();
		const subscribed = vi.fn();
		const second = new Subject<void>();
		second.subscribe = subscribed;

		toggle.run({ key: "g1", request: first, failureMessage: "x" });
		toggle.run({ key: "g1", request: second, failureMessage: "x" });

		expect(toggle.isPending("g1")).toBe(true);
		expect(subscribed).not.toHaveBeenCalled();
	});

	it("allows another key and runs again after completion", () => {
		const toggle = setup();
		const first = new Subject<void>();
		const onSuccess = vi.fn();

		toggle.run({
			key: "g1",
			request: first,
			failureMessage: "x",
			onSuccess
		});
		toggle.run({
			key: "g2",
			request: new Subject<void>(),
			failureMessage: "x"
		});
		first.next();
		first.complete();

		expect(toggle.isPending("g1")).toBe(false);
		expect(toggle.isPending("g2")).toBe(true);
		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it("treats a 404 as missing and calls onMissing", () => {
		const toggle = setup();
		const onMissing = vi.fn();

		toggle.run({
			key: "g1",
			request: failure(404),
			failureMessage: "failed",
			missingMessage: "gone",
			onMissing
		});

		expect(toast.error).toHaveBeenCalledWith("gone");
		expect(onMissing).toHaveBeenCalledOnce();
		expect(toggle.isPending("g1")).toBe(false);
	});

	it("shows the failure toast on a 500 and releases the key", () => {
		const toggle = setup();

		toggle.run({
			key: "g1",
			request: failure(500),
			failureMessage: "failed"
		});

		expect(toast.error).toHaveBeenCalledWith("failed");
		expect(toggle.isPending("g1")).toBe(false);
	});

	it("does not repeat a toast the interceptor already shows", () => {
		const toggle = setup();

		toggle.run({
			key: "g1",
			request: failure(409),
			failureMessage: "failed"
		});
		toggle.run({
			key: "g2",
			request: failure(0),
			failureMessage: "offline"
		});

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith("offline");
	});
});
