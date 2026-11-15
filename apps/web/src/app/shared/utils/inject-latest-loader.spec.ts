import { Injector, runInInjectionContext } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";

import { injectLatestLoader } from "./inject-latest-loader";

describe("injectLatestLoader", () => {
	function createLoader() {
		const injector = TestBed.inject(Injector);
		return runInInjectionContext(injector, () => injectLatestLoader());
	}

	it("ignores a slow response that arrives after a newer request", () => {
		const loader = createLoader();
		const first = new Subject<string>();
		const second = new Subject<string>();
		const received: string[] = [];

		loader.load(first, { next: value => received.push(value) });
		loader.load(second, { next: value => received.push(value) });
		second.next("second");
		first.next("first");

		expect(received).toEqual(["second"]);
		expect(first.observed).toBe(false);
	});

	it("flags a failure and clears it as soon as the next request starts", () => {
		const loader = createLoader();
		const failing = new Subject<string>();
		const onError = vi.fn();

		loader.load(failing, { next: vi.fn(), error: onError });
		failing.error(new Error("boom"));

		expect(loader.failed()).toBe(true);
		expect(onError).toHaveBeenCalledTimes(1);

		loader.load(new Subject<string>(), { next: vi.fn() });

		expect(loader.failed()).toBe(false);
	});

	it("keeps a single request alive when retry is hammered", () => {
		const loader = createLoader();
		const sources = [new Subject<string>(), new Subject<string>()];
		const received: string[] = [];

		sources.forEach(source =>
			loader.load(source, { next: value => received.push(value) })
		);
		sources[0].next("stale");
		sources[1].next("fresh");

		expect(sources[0].observed).toBe(false);
		expect(sources[1].observed).toBe(true);
		expect(received).toEqual(["fresh"]);
	});

	it("drops a stale failure instead of flagging the page", () => {
		const loader = createLoader();
		const first = new Subject<string>();
		const second = new Subject<string>();

		loader.load(first, { next: vi.fn() });
		loader.load(second, { next: vi.fn() });
		first.error(new Error("late failure"));

		expect(loader.failed()).toBe(false);
	});

	it("cancels the in-flight request on demand", () => {
		const loader = createLoader();
		const source = new Subject<string>();
		const next = vi.fn();

		loader.load(source, { next });
		loader.cancel();
		source.next("ignored");

		expect(next).not.toHaveBeenCalled();
		expect(source.observed).toBe(false);
	});

	it("cancels the in-flight request when its owner is destroyed", () => {
		const loader = createLoader();
		const source = new Subject<string>();
		const next = vi.fn();

		loader.load(source, { next });
		TestBed.resetTestingModule();
		source.next("after destroy");

		expect(next).not.toHaveBeenCalled();
	});
});
