import { TestBed } from "@angular/core/testing";
import { Subject, throwError } from "rxjs";

import { FollowRequestsService } from "../../core/services/follow-requests";
import { ToastService } from "../../core/services/toast";
import { injectFollowRequestActions } from "./inject-follow-request-actions";

describe("injectFollowRequestActions", () => {
	const accept = vi.fn();
	const reject = vi.fn();
	const removeLocally = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };

	function setup() {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: FollowRequestsService,
					useValue: { accept, reject, removeLocally }
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectFollowRequestActions()
		);
	}

	beforeEach(() => vi.clearAllMocks());

	it("ignores a second accept while the first is in flight", () => {
		const pending = new Subject<unknown>();
		accept.mockReturnValue(pending);
		const actions = setup();

		actions.accept("u2");
		actions.accept("u2");
		actions.reject("u3");

		expect(accept).toHaveBeenCalledTimes(1);
		expect(reject).not.toHaveBeenCalled();
		expect(actions.resolvingId()).toBe("u2");
	});

	it("announces an accepted request and frees the lock", () => {
		accept.mockReturnValue(new Subject<unknown>());
		const done = new Subject<unknown>();
		accept.mockReturnValue(done);
		const actions = setup();

		actions.accept("u2");
		done.next({});

		expect(toast.success).toHaveBeenCalledWith("Follow request accepted.");
		expect(actions.resolvingId()).toBeNull();
	});

	it("drops the row silently on USER_FOLLOW_REQUEST_NOT_FOUND", () => {
		accept.mockReturnValue(throwError(() => ({ status: 404 })));
		const actions = setup();

		actions.accept("u2");

		expect(removeLocally).toHaveBeenCalledWith("u2");
		expect(toast.warning).not.toHaveBeenCalled();
		expect(actions.resolvingId()).toBeNull();
	});

	it.each([[500], [0]])("warns and keeps the row on status %i", status => {
		reject.mockReturnValue(throwError(() => ({ status })));
		const actions = setup();

		actions.reject("u2");

		expect(toast.warning).toHaveBeenCalledWith(
			"Could not reject the request."
		);
		expect(removeLocally).not.toHaveBeenCalled();
		expect(actions.resolvingId()).toBeNull();
	});
});
