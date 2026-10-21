import { Injector, runInInjectionContext, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { injectPublicCollection } from "./public-collection";

interface Item {
	title: string;
	backgroundUrl?: string;
	platform?: { id: string; abbreviation: string } | null;
}

const items: Item[] = [
	{ title: "Hades", platform: { id: "pc", abbreviation: "PC" } },
	{ title: "Hollow Knight", platform: { id: "sw", abbreviation: "NSW" } },
	{
		title: "Celeste",
		backgroundUrl: "c.jpg",
		platform: { id: "pc", abbreviation: "PC" }
	}
];

describe("injectPublicCollection", () => {
	let token: string | null;
	const user = signal<unknown>(null);
	const loadUser = vi.fn();

	beforeEach(() => {
		token = null;
		user.set(null);
		loadUser.mockReset();
		TestBed.configureTestingModule({
			providers: [
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { paramMap: { get: () => "ada" } }
					}
				},
				{
					provide: AuthService,
					useValue: { token: () => token, user, loadUser }
				}
			]
		});
	});

	function create(
		fetchPage = vi.fn().mockReturnValue(of({ items, total: 3 })),
		withPlatform = true
	) {
		const collection = runInInjectionContext(TestBed.inject(Injector), () =>
			injectPublicCollection<Item>(fetchPage, item => item, {
				limit: 2,
				platformOf: withPlatform ? item => item.platform : undefined
			})
		);
		return { collection, fetchPage };
	}

	it("reads the username from the route and loads the first page", () => {
		const { collection, fetchPage } = create();

		expect(fetchPage).toHaveBeenCalledWith("ada", { limit: 2, offset: 0 });
		expect(collection.username()).toBe("ada");
		expect(collection.items()).toEqual(items);
		expect(collection.total()).toBe(3);
		expect(collection.isLoading()).toBe(false);
		expect(collection.error()).toBeNull();
	});

	it("is loading until the page arrives", () => {
		const pending = new Subject<{ items: Item[]; total: number }>();

		const { collection } = create(vi.fn().mockReturnValue(pending));

		expect(collection.isLoading()).toBe(true);
		pending.next({ items, total: 3 });
		expect(collection.isLoading()).toBe(false);
	});

	it("loads the viewer before the page when there is a token but no user", () => {
		token = "t";
		loadUser.mockReturnValue(of({}));

		const { fetchPage } = create();

		expect(loadUser).toHaveBeenCalledTimes(1);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("still loads the page when loading the viewer fails", () => {
		token = "t";
		loadUser.mockReturnValue(throwError(() => new Error("401")));

		const { fetchPage } = create();

		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("skips loading the viewer when the user is already known", () => {
		token = "t";
		user.set({ id: "u1" });

		create();

		expect(loadUser).not.toHaveBeenCalled();
	});

	it.each([
		[403, "private"],
		[404, "not_found"]
	])("maps a %s response to the %s error", (status, expected) => {
		const { collection } = create(
			vi.fn().mockReturnValue(throwError(() => ({ status })))
		);

		expect(collection.error()).toBe(expected);
		expect(collection.isLoading()).toBe(false);
	});

	it("leaves the error empty for other failures but stops loading", () => {
		const { collection } = create(
			vi.fn().mockReturnValue(throwError(() => ({ status: 500 })))
		);

		expect(collection.error()).toBeNull();
		expect(collection.isLoading()).toBe(false);
	});

	it("filters the visible items by title ignoring case and spaces around", () => {
		const { collection } = create();

		collection.query.set("  HO ");

		expect(collection.visibleItems().map(i => i.title)).toEqual([
			"Hollow Knight"
		]);
	});

	it("filters the visible items by selected platform", () => {
		const { collection } = create();

		collection.platform.set("pc");

		expect(collection.visibleItems().map(i => i.title)).toEqual([
			"Hades",
			"Celeste"
		]);
	});

	it("counts items per platform", () => {
		const { collection } = create();

		expect(collection.platformCounts()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: "pc", count: 2 }),
				expect.objectContaining({ id: "sw", count: 1 })
			])
		);
	});

	it("has no platform counts or platform filtering without platformOf", () => {
		const { collection } = create(undefined, false);

		collection.platform.set("pc");

		expect(collection.platformCounts()).toEqual([]);
		expect(collection.visibleItems()).toHaveLength(3);
	});

	it("builds posters from the loaded items", () => {
		const { collection } = create();

		expect(collection.posters()[2]).toEqual({
			src: "c.jpg",
			title: "Celeste"
		});
	});

	it("goes to another page resetting filters and refetching with the offset", () => {
		const { collection, fetchPage } = create();
		collection.query.set("ha");
		collection.platform.set("pc");

		collection.goToOffset(2);

		expect(fetchPage).toHaveBeenLastCalledWith("ada", {
			limit: 2,
			offset: 2
		});
		expect(collection.offset()).toBe(2);
		expect(collection.query()).toBe("");
		expect(collection.platform()).toBe("");
	});

	it("clears a previous error when loading another page", () => {
		const fetchPage = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 403 })))
			.mockReturnValue(of({ items, total: 3 }));
		const { collection } = create(fetchPage);
		expect(collection.error()).toBe("private");

		collection.goToOffset(0);

		expect(collection.error()).toBeNull();
	});
});
