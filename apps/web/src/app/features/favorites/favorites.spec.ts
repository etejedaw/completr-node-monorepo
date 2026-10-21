import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { type FavoriteEntry, type User } from "../../core/models";
import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { FavoritesService } from "./favorites";

function entry(gameId: string): FavoriteEntry {
	return { id: `f-${gameId}`, game: { id: gameId } } as FavoriteEntry;
}

describe("FavoritesService", () => {
	const url = `${environment.apiUrl}/users/me/favorites`;
	const toast = { error: vi.fn() };
	const user = signal<User | null>({ id: "user-a" } as User);
	let service: FavoritesService;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		toast.error.mockReset();
		user.set({ id: "user-a" } as User);
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast },
				{ provide: AuthService, useValue: { user: user.asReadonly() } }
			]
		});
		service = TestBed.inject(FavoritesService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	function loadFavorites(...gameIds: string[]) {
		service.load().subscribe();
		httpTesting
			.expectOne(r => r.url === url)
			.flush({ data: { favorites: gameIds.map(entry) } });
	}

	it("loads the favorites and tracks the game ids", () => {
		loadFavorites("g1", "g2");

		expect(service.favorites().map(f => f.game.id)).toEqual(["g1", "g2"]);
		expect(service.isFavorite("g1")).toBe(true);
		expect(service.isFavorite("g3")).toBe(false);
	});

	it("does not replace the known ids when loading a paged or searched slice", () => {
		loadFavorites("g1", "g2");

		service.load({ offset: 10 }).subscribe();
		httpTesting
			.expectOne(r => r.url === url)
			.flush({ data: { favorites: [entry("g9")] } });

		expect(service.isFavorite("g2")).toBe(true);
		expect(service.isFavorite("g9")).toBe(false);
		expect(service.favorites().map(f => f.game.id)).toEqual(["g9"]);
	});

	it("fetches the game ids once and reuses them afterwards", () => {
		service.ensureIdsLoaded().subscribe();
		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: ["g1"] } });

		service.ensureIdsLoaded().subscribe();

		httpTesting.expectNone(`${url}/game-ids`);
		expect(service.isFavorite("g1")).toBe(true);
	});

	it("does not refetch the game ids when the user has no favorites", () => {
		service.ensureIdsLoaded().subscribe();
		httpTesting
			.expectOne(`${url}/game-ids`)
			.flush({ data: { gameIds: [] } });

		service.ensureIdsLoaded().subscribe();

		httpTesting.expectNone(`${url}/game-ids`);
	});

	it("does not refetch the game ids after loading an empty list", () => {
		loadFavorites();

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
		expect(service.isFavorite("g1")).toBe(true);
	});

	it("clears the favorites and ids when the user signs out", () => {
		TestBed.tick();
		loadFavorites("g1");

		user.set(null);
		TestBed.tick();

		expect(service.favorites()).toEqual([]);
		expect(service.favoriteIds().size).toBe(0);
	});

	it("keeps the loaded data when the first user resolves after startup", () => {
		user.set(null);
		TestBed.tick();
		loadFavorites("g1");

		user.set({ id: "user-a" } as User);
		TestBed.tick();

		expect(service.isFavorite("g1")).toBe(true);
	});

	it("replaces all favorites with the given ids", () => {
		let result: unknown;

		service.replaceFavorites(["g2", "g1"]).subscribe(r => (result = r));

		const req = httpTesting.expectOne(url);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({ gameIds: ["g2", "g1"] });
		req.flush({ data: { favorites: [entry("g2"), entry("g1")] } });
		expect(result).toEqual([entry("g2"), entry("g1")]);
		expect(service.favoriteIds()).toEqual(new Set(["g1", "g2"]));
	});

	describe("toggle", () => {
		it("adds the game optimistically and confirms with the server list", () => {
			loadFavorites("g1");

			service.toggle("g2").subscribe();

			expect(service.isFavorite("g2")).toBe(true);
			const req = httpTesting.expectOne(url);
			expect(req.request.method).toBe("PUT");
			expect(req.request.body).toEqual({ gameIds: ["g1", "g2"] });
			req.flush({ data: { favorites: [entry("g1"), entry("g2")] } });
			expect(service.favorites()).toHaveLength(2);
		});

		it("removes a game that is already a favorite", () => {
			loadFavorites("g1", "g2");

			service.toggle("g1").subscribe();

			expect(service.isFavorite("g1")).toBe(false);
			const req = httpTesting.expectOne(url);
			expect(req.request.body).toEqual({ gameIds: ["g2"] });
			req.flush({ data: { favorites: [entry("g2")] } });
		});

		it("rolls back the optimistic change when the server fails", () => {
			loadFavorites("g1");

			service.toggle("g2").subscribe({ error: () => undefined });
			httpTesting
				.expectOne(url)
				.flush(null, { status: 500, statusText: "Server Error" });

			expect(service.isFavorite("g2")).toBe(false);
			expect(service.isFavorite("g1")).toBe(true);
		});

		it("blocks adding beyond 100 favorites with a toast and no request", () => {
			const ids = Array.from({ length: 100 }, (_, i) => `g${i}`);
			loadFavorites(...ids);
			const onError = vi.fn();

			service.toggle("extra").subscribe({ error: onError });

			expect(toast.error).toHaveBeenCalledWith(
				"You can only have up to 100 favorites."
			);
			expect(onError).toHaveBeenCalledTimes(1);
			expect(service.isFavorite("extra")).toBe(false);
			httpTesting.expectNone(url);
		});

		it("still allows removing a favorite when at the limit", () => {
			const ids = Array.from({ length: 100 }, (_, i) => `g${i}`);
			loadFavorites(...ids);

			service.toggle("g0").subscribe();

			const req = httpTesting.expectOne(url);
			expect(req.request.body.gameIds).toHaveLength(99);
			req.flush({ data: { favorites: [] } });
			expect(toast.error).not.toHaveBeenCalled();
		});
	});

	describe("removeFavorite", () => {
		it("removes using the already known ids", () => {
			loadFavorites("g1", "g2");

			service.removeFavorite("g1").subscribe();

			httpTesting.expectNone(`${url}/game-ids`);
			const req = httpTesting.expectOne(url);
			expect(req.request.method).toBe("PUT");
			expect(req.request.body).toEqual({ gameIds: ["g2"] });
			req.flush({ data: { favorites: [entry("g2")] } });
			expect(service.isFavorite("g1")).toBe(false);
		});

		it("loads the ids first when they are not known yet", () => {
			service.removeFavorite("g1").subscribe();

			httpTesting
				.expectOne(`${url}/game-ids`)
				.flush({ data: { gameIds: ["g1", "g2"] } });
			const req = httpTesting.expectOne(url);
			expect(req.request.body).toEqual({ gameIds: ["g2"] });
			req.flush({ data: { favorites: [entry("g2")] } });
		});
	});
});
