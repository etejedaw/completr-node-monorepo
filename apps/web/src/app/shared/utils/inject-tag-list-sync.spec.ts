import { HttpErrorResponse } from "@angular/common/http";
import {
	createEnvironmentInjector,
	EnvironmentInjector,
	runInInjectionContext
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";

import { ToastService } from "../../core/services/toast";
import {
	injectTagListSync,
	sameTagOrder,
	sameTagSet
} from "./inject-tag-list-sync";

describe("injectTagListSync", () => {
	let saves: { tags: readonly string[]; reply: Subject<string[]> }[];
	let toast: { error: ReturnType<typeof vi.fn<(message: string) => void>> };
	let failed: ReturnType<typeof vi.fn<(error: unknown) => void>>;
	let injector: EnvironmentInjector;

	function createSync(sameList = sameTagOrder) {
		return runInInjectionContext(injector, () =>
			injectTagListSync({
				save: tags => {
					const reply = new Subject<string[]>();
					saves.push({ tags, reply });
					return reply;
				},
				sameList,
				failureMessage: "Couldn't save.",
				onFailed: failed
			})
		);
	}

	function answer(index: number, tags: string[]) {
		saves[index].reply.next(tags);
		saves[index].reply.complete();
	}

	function fail(index: number, status: number) {
		saves[index].reply.error(new HttpErrorResponse({ status }));
	}

	beforeEach(() => {
		saves = [];
		toast = { error: vi.fn() };
		failed = vi.fn();
		TestBed.configureTestingModule({
			providers: [{ provide: ToastService, useValue: toast }]
		});
		injector = createEnvironmentInjector(
			[],
			TestBed.inject(EnvironmentInjector)
		);
	});

	it("shows the change at once and keeps it when the server accepts it", () => {
		const sync = createSync();
		sync.reset(["cozy"]);

		sync.set(["cozy", "short"]);

		expect(sync.desired()).toEqual(["cozy", "short"]);
		expect(sync.saving()).toBe(true);
		expect(sync.isPending("short")).toBe(true);
		answer(0, ["cozy", "short"]);
		expect(sync.confirmed()).toEqual(["cozy", "short"]);
		expect(sync.isPending("short")).toBe(false);
		expect(sync.saving()).toBe(false);
	});

	it("sends one request at a time and then the latest list after rapid changes", () => {
		const sync = createSync();
		sync.reset([]);

		sync.set(["a"]);
		sync.set(["a", "b"]);
		sync.set(["a", "b", "c"]);

		expect(saves).toHaveLength(1);
		expect(saves[0].tags).toEqual(["a"]);
		answer(0, ["a"]);
		expect(saves).toHaveLength(2);
		expect(saves[1].tags).toEqual(["a", "b", "c"]);
		answer(1, ["a", "b", "c"]);
		expect(saves).toHaveLength(2);
		expect(sync.desired()).toEqual(["a", "b", "c"]);
	});

	it("sends nothing when the user undoes a change before it goes out", () => {
		const sync = createSync();
		sync.reset(["a"]);

		sync.set(["a", "b"]);
		sync.set(["a"]);
		answer(0, ["a", "b"]);

		expect(saves).toHaveLength(2);
		expect(saves[1].tags).toEqual(["a"]);
		answer(1, ["a"]);
		expect(sync.desired()).toEqual(["a"]);
	});

	it("rolls back to the last saved list and reports a server failure", () => {
		const sync = createSync();
		sync.reset(["cozy"]);

		sync.set([]);
		fail(0, 500);

		expect(sync.desired()).toEqual(["cozy"]);
		expect(sync.saving()).toBe(false);
		expect(toast.error).toHaveBeenCalledWith("Couldn't save.");
		expect(failed).toHaveBeenCalledTimes(1);
	});

	it("rolls back without a second toast when the interceptor already warned about a plan limit", () => {
		const sync = createSync();
		sync.reset([]);

		sync.set(["new"]);
		fail(0, 402);

		expect(sync.desired()).toEqual([]);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("ignores a late answer that belongs to a list it no longer shows", () => {
		const sync = createSync();
		sync.reset(["old game tag"]);
		sync.set([]);

		sync.reset(["other game"]);
		fail(0, 500);

		expect(sync.desired()).toEqual(["other game"]);
		expect(toast.error).not.toHaveBeenCalled();
		sync.set(["other game", "x"]);
		expect(saves).toHaveLength(2);
	});

	it("treats a reordered answer as the same set when asked to", () => {
		const sync = createSync(sameTagSet);
		sync.reset([]);

		sync.set(["b", "a"]);
		answer(0, ["a", "b"]);

		expect(saves).toHaveLength(1);
		expect(sync.desired()).toEqual(["a", "b"]);
	});

	it("lets the request in flight finish but sends nothing else after it is destroyed", () => {
		const sync = createSync();
		sync.reset([]);
		sync.set(["a"]);
		sync.set(["a", "b"]);

		injector.destroy();
		answer(0, ["a"]);

		expect(saves).toHaveLength(1);
	});
});
