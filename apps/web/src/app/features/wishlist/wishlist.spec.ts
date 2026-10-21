import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { type User, type WishlistEntry } from "../../core/models";
import { AuthService } from "../../core/services/auth";
import { WishlistService } from "./wishlist";

function entry(gameId: string): WishlistEntry {
	return { id: `w-${gameId}`, game: { id: gameId } } as WishlistEntry;
}

describe("WishlistService", () => {
	const url = `${environment.apiUrl}/users/me/wishlist`;
	const user = signal<User | null>({ id: "user-a" } as User);
	let service: WishlistService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		user.set({ id: "user-a" } as User);
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { user: user.asReadonly() } }
			]
		});
		service = TestBed.inject(WishlistService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	function loadWishlist(...gameIds: string[]) {
		service.load().subscribe();
		httpTesting
			.expectOne(r => r.url === url)
			.flush({ data: { wishlist: gameIds.map(entry) } });
	}

	it("loads the wishlist and tracks the game ids", () => {
		loadWishlist("g1", "g2");

		expect(service.wishlist().map(w => w.game.id)).toEqual(["g1", "g2"]);
		expect(service.isInWishlist("g1")).toBe(true);
		expect(service.isInWishlist("g3")).toBe(false);
	});

	it("sends pagination and search as query params", () => {
		service.load({ limit: 20, offset: 0, search: "" }).subscribe();

		const req = httpTesting.expectOne(r => r.url === url);
		expect(req.request.params.get("limit")).toBe("20");
		expect(req.request.params.get("offset")).toBe("0");
		expect(req.request.params.has("search")).toBe(false);
		req.flush({ data: { wishlist: [] } });
	});

	it("does not overwrite the known ids when loading a searched or paged slice", () => {
		loadWishlist("g1", "g2");

		service.load({ search: "x" }).subscribe();
		httpTesting
			.expectOne(r => r.url === url)
			.flush({ data: { wishlist: [entry("g1")] } });

		expect(service.isInWishlist("g2")).toBe(true);
		expect(service.wishlist().map(w => w.game.id)).toEqual(["g1"]);
	});

	it("fetches the game ids once and emits the cached set afterwards", () => {
		let ids: Set<string> | undefined;

		service.ensureIdsLoaded().subscribe(r => (ids = r));
		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: ["g1", "g2"] } });
		expect(ids).toEqual(new Set(["g1", "g2"]));
		expect(service.isInWishlist("g2")).toBe(true);

		service.ensureIdsLoaded().subscribe(r => (ids = r));

		httpTesting.expectNone(`${url}/game-ids`);
		expect(ids).toEqual(new Set(["g1", "g2"]));
	});

	it("does not refetch the game ids when the wishlist is empty", () => {
		service.ensureIdsLoaded().subscribe();
		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: [] } });

		service.ensureIdsLoaded().subscribe();

		httpTesting.expectNone(`${url}/game-ids`);
	});

	it("refetches the game ids when another user signs in after an empty session", () => {
		TestBed.tick();
		service.ensureIdsLoaded().subscribe();
		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: [] } });

		user.set(null);
		TestBed.tick();
		user.set({ id: "user-b" } as User);
		TestBed.tick();
		service.ensureIdsLoaded().subscribe();

		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: ["g1"] } });
		expect(service.isInWishlist("g1")).toBe(true);
	});

	it("clears the wishlist and ids when the user signs out", () => {
		TestBed.tick();
		loadWishlist("g1");

		user.set(null);
		TestBed.tick();

		expect(service.wishlist()).toEqual([]);
		expect(service.isInWishlist("g1")).toBe(false);
	});

	it("keeps the loaded data when the first user resolves after startup", () => {
		user.set(null);
		TestBed.tick();
		loadWishlist("g1");

		user.set({ id: "user-a" } as User);
		TestBed.tick();

		expect(service.isInWishlist("g1")).toBe(true);
	});

	it("shares one game-ids request between concurrent callers", () => {
		service.ensureIdsLoaded().subscribe();
		service.ensureIdsLoaded().subscribe();

		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: ["g1"] } });
	});

	it("adds a game with the platform and appends it locally", () => {
		let result: unknown;

		service.add("g1", "p1").subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ gameId: "g1", platformId: "p1" });
		req.flush({ data: { wishlist: entry("g1") } });
		expect(result).toEqual(entry("g1"));
		expect(service.isInWishlist("g1")).toBe(true);
		expect(service.wishlist()).toHaveLength(1);
	});

	it("omits the platform from the body when none is given", () => {
		service.add("g1").subscribe();

		const req = httpTesting.expectOne(url);
		expect(req.request.body).toEqual({ gameId: "g1" });
		req.flush({ data: { wishlist: entry("g1") } });
	});

	it("removes a game and updates the local state", () => {
		loadWishlist("g1", "g2");

		service.remove("g1").subscribe();

		const req = httpTesting.expectOne(`${url}/g1`);
		expect(req.request.method).toBe("DELETE");
		req.flush(null);
		expect(service.wishlist().map(w => w.game.id)).toEqual(["g2"]);
		expect(service.isInWishlist("g1")).toBe(false);
	});

	it("keeps the local state when removing fails", () => {
		loadWishlist("g1");

		service.remove("g1").subscribe({ error: () => undefined });
		httpTesting
			.expectOne(`${url}/g1`)
			.flush(null, { status: 500, statusText: "Server Error" });

		expect(service.isInWishlist("g1")).toBe(true);
	});

	it("toggle removes a game that is already in the wishlist", () => {
		loadWishlist("g1");

		service.toggle("g1").subscribe();

		expect(httpTesting.expectOne(`${url}/g1`).request.method).toBe(
			"DELETE"
		);
	});

	it("toggle adds a game that is not in the wishlist and emits undefined", () => {
		const onNext = vi.fn();

		service.toggle("g9").subscribe(onNext);

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("POST");
		req.flush({ data: { wishlist: entry("g9") } });
		expect(onNext).toHaveBeenCalledWith(undefined);
	});

	it("replaces the whole wishlist with the given ids", () => {
		loadWishlist("g1");

		service.replaceWishlist(["g2", "g3"]).subscribe();

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ gameIds: ["g2", "g3"] });
		req.flush({ data: { wishlist: [entry("g2"), entry("g3")] } });
		expect(service.isInWishlist("g1")).toBe(false);
		expect(service.isInWishlist("g3")).toBe(true);
	});
});
