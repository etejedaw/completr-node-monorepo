import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { type Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import { PublicProfileService } from "./public-profile.service";
import { PublicLibraryService } from "./services/public-library.service";
import { PublicListsService } from "./services/public-lists.service";
import { PublicReviewsService } from "./services/public-reviews.service";
import { PublicSocialService } from "./services/public-social.service";

describe("public profile services", () => {
	const users = `${environment.apiUrl}/users`;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	it("PublicProfileService fetches the profile of a user and unwraps it", () => {
		const profile = { user: { username: "ada" }, followerCount: 2 };
		let result: unknown;

		TestBed.inject(PublicProfileService)
			.getProfile("ada")
			.subscribe(r => (result = r));

		const req = httpTesting.expectOne(`${users}/ada`);
		expect(req.request.method).toBe("GET");
		req.flush({ data: profile });
		expect(result).toEqual(profile);
	});

	describe("PublicLibraryService", () => {
		let service: PublicLibraryService;

		beforeEach(() => {
			service = TestBed.inject(PublicLibraryService);
		});

		it("maps the backlog to items and total, sending the filters as params", () => {
			let result: unknown;

			service
				.getUserBacklog("ada", { status: "playing", limit: 20 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/backlog`
			);
			expect(req.request.method).toBe("GET");
			expect(req.request.params.get("status")).toBe("playing");
			expect(req.request.params.get("limit")).toBe("20");
			req.flush({ data: { backlog: [{ id: "b1" }], total: 7 } });
			expect(result).toEqual({ items: [{ id: "b1" }], total: 7 });
		});

		it.each([
			["getUserFavorites", "favorites", "favorites"],
			["getUserQueue", "queue", "queue"],
			["getUserWishlist", "wishlist", "wishlist"],
			["getUserGameShelf", "game-shelf", "gameShelf"]
		] as const)(
			"%s reads /%s with pagination and maps %s to items",
			(method, path, key) => {
				let result: unknown;

				const page$: Observable<unknown> = service[method]("ada", {
					limit: 10,
					offset: 30
				});
				page$.subscribe(r => (result = r));

				const req = httpTesting.expectOne(
					r => r.url === `${users}/ada/${path}`
				);
				expect(req.request.method).toBe("GET");
				expect(req.request.params.get("limit")).toBe("10");
				expect(req.request.params.get("offset")).toBe("30");
				req.flush({ data: { [key]: [{ id: "x" }], total: 4 } });
				expect(result).toEqual({ items: [{ id: "x" }], total: 4 });
			}
		);

		it("sends no pagination params by default", () => {
			service.getUserQueue("ada").subscribe();

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/queue`
			);
			expect(req.request.params.keys()).toEqual([]);
			req.flush({ data: { queue: [], total: 0 } });
		});

		it("returns only the franchises list", () => {
			let result: unknown;

			service.getUserFranchises("ada").subscribe(r => (result = r));

			httpTesting
				.expectOne(`${users}/ada/franchises`)
				.flush({ data: { franchises: [{ id: "f1" }], total: 1 } });
			expect(result).toEqual([{ id: "f1" }]);
		});

		it("requests the comparison by dimension with pagination", () => {
			const comparison = { by: "completed", inCommon: [] };
			let result: unknown;

			service
				.getComparison("ada", "completed", { limit: 5 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/comparison`
			);
			expect(req.request.params.get("by")).toBe("completed");
			expect(req.request.params.get("limit")).toBe("5");
			req.flush({ data: comparison });
			expect(result).toEqual(comparison);
		});
	});

	describe("PublicListsService", () => {
		let service: PublicListsService;

		beforeEach(() => {
			service = TestBed.inject(PublicListsService);
		});

		it("maps the user lists to items and total", () => {
			let result: unknown;

			service.getUserLists("ada").subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${users}/ada/lists`);
			expect(req.request.method).toBe("GET");
			req.flush({ data: { lists: [{ id: "l1" }], total: 1 } });
			expect(result).toEqual({ items: [{ id: "l1" }], total: 1 });
		});

		it("maps the followed lists to items and total, with pagination", () => {
			let result: unknown;

			service
				.getUserFollowingLists("ada", { limit: 3, offset: 6 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/following-lists`
			);
			expect(req.request.params.get("limit")).toBe("3");
			expect(req.request.params.get("offset")).toBe("6");
			req.flush({ data: { followingLists: [{ id: "l2" }], total: 9 } });
			expect(result).toEqual({ items: [{ id: "l2" }], total: 9 });
		});
	});

	describe("PublicReviewsService", () => {
		let service: PublicReviewsService;

		beforeEach(() => {
			service = TestBed.inject(PublicReviewsService);
		});

		it("returns the reviews and total with pagination", () => {
			const data = { reviews: [{ id: "r1" }], total: 1 };
			let result: unknown;

			service
				.getUserReviews("ada", { limit: 5, offset: 0 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/reviews`
			);
			expect(req.request.params.get("limit")).toBe("5");
			expect(req.request.params.get("offset")).toBe("0");
			req.flush({ data });
			expect(result).toEqual(data);
		});

		it("unwraps the highlights for the requested year and month", () => {
			const highlights = { recent: [], month: { completedCount: 2 } };
			let result: unknown;

			service
				.getHighlights("ada", { year: 2026, month: 3 })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${users}/ada/highlights`
			);
			expect(req.request.params.get("year")).toBe("2026");
			expect(req.request.params.get("month")).toBe("3");
			req.flush({ data: { highlights } });
			expect(result).toEqual(highlights);
		});
	});

	describe("PublicSocialService", () => {
		let service: PublicSocialService;

		beforeEach(() => {
			service = TestBed.inject(PublicSocialService);
		});

		it("follows a user and returns the follow result", () => {
			let result: unknown;

			service.follow("ada").subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${users}/ada/follow`);
			expect(req.request.method).toBe("POST");
			req.flush({ data: { status: "pending", targetId: "u1" } });
			expect(result).toEqual({ status: "pending", targetId: "u1" });
		});

		it("unfollows a user", () => {
			service.unfollow("ada").subscribe();

			const req = httpTesting.expectOne(`${users}/ada/follow`);
			expect(req.request.method).toBe("DELETE");
			req.flush(null);
		});

		it("cancels a sent follow request", () => {
			service.cancelFollowRequest("ada").subscribe();

			const req = httpTesting.expectOne(
				`${users}/me/follow-requests/sent/ada`
			);
			expect(req.request.method).toBe("DELETE");
			req.flush(null);
		});

		it.each([
			["getFollowers", "followers"],
			["getFollowing", "following"]
		] as const)(
			"%s reads a page of /%s with limit, offset and search and returns users and total",
			(method, path) => {
				let result: unknown;

				service[method]("ada", {
					limit: 24,
					offset: 48,
					search: "bo"
				}).subscribe(r => (result = r));

				const req = httpTesting.expectOne(
					r => r.url === `${users}/ada/${path}`
				);
				expect(req.request.method).toBe("GET");
				expect(req.request.params.get("limit")).toBe("24");
				expect(req.request.params.get("offset")).toBe("48");
				expect(req.request.params.get("search")).toBe("bo");
				req.flush({ data: { users: [{ id: "u2" }], total: 49 } });
				expect(result).toEqual({ users: [{ id: "u2" }], total: 49 });
			}
		);

		it.each([
			["getFollowers", "followers"],
			["getFollowing", "following"]
		] as const)(
			"%s leaves out an empty search and the params it was not given",
			(method, path) => {
				service[method]("ada", { offset: 0, search: "" }).subscribe();

				const req = httpTesting.expectOne(
					r => r.url === `${users}/ada/${path}`
				);
				expect(req.request.params.keys()).toEqual(["offset"]);
				req.flush({ data: { users: [], total: 0 } });
			}
		);

		it("getAllFollowing walks every page of /following and returns all the users", () => {
			let result: unknown;

			service.getAllFollowing("ada").subscribe(r => (result = r));

			const first = httpTesting.expectOne(
				r => r.url === `${users}/ada/following`
			);
			expect(first.request.params.get("limit")).toBe("100");
			expect(first.request.params.get("offset")).toBe("0");
			first.flush({
				data: {
					users: Array.from({ length: 100 }, (_, i) => ({
						id: `a${i}`
					})),
					total: 102
				}
			});
			const second = httpTesting.expectOne(
				r => r.url === `${users}/ada/following`
			);
			expect(second.request.params.get("offset")).toBe("100");
			second.flush({
				data: { users: [{ id: "b0" }, { id: "b1" }], total: 102 }
			});

			expect(result).toHaveLength(102);
			expect((result as { id: string }[]).at(-1)).toEqual({ id: "b1" });
		});
	});
});
