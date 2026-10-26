import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Activity } from "../../src/activity/activity.model";
import { type User } from "../../src/users/user.model";
import {
	type UserHighlightsBundle,
	type UserReviewsBundle
} from "../../src/users/users.interface";
import {
	enrichedUserListSerializer,
	fullProfileSerializer,
	restrictedProfileSerializer,
	userAdminSerializer,
	userCardSerializer,
	userCompletionsSerializer,
	userHighlightsSerializer,
	userMeSerializer,
	userProfileSerializer,
	userPublicSerializer,
	userReviewsSerializer,
	userSummarySerializer
} from "../../src/users/users.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildBacklog } from "../unit-helpers/builders";

function buildUser(overrides: Record<string, unknown> = {}) {
	const plain = {
		id: "u-1",
		username: "player",
		email: "private@example.com",
		passwordHash: "hash",
		role: "user",
		isActive: true,
		name: "Player",
		bio: "bio",
		avatarUrl: null,
		profileVisibility: "public",
		queueVisibility: "friends",
		wishlistVisibility: "private",
		favoriteVisibility: "public",
		feedVisibility: "public",
		backlogVisibility: "public",
		shelfVisibility: "private",
		listVisibility: "public",
		platinumVisibility: "private",
		acceptFollowRequests: true,
		theme: "refined-dark",
		createdAt: new Date("2024-01-01"),
		...overrides
	};
	return asModel<User>({ ...plain, get: () => plain });
}

const SENSITIVE = ["private@example.com", "hash"];

function leaksSensitiveData(value: unknown) {
	const serialized = JSON.stringify(value);
	return SENSITIVE.some(secret => serialized.includes(secret));
}

void describe("user serializers", () => {
	void it("never expose email or password hash except the admin view", () => {
		const user = buildUser();

		for (const serialized of [
			userMeSerializer(user),
			userPublicSerializer(user),
			userProfileSerializer(user),
			userSummarySerializer(user)
		]) {
			assert.equal(leaksSensitiveData(serialized), false);
		}
	});

	void it("exposes the email only in the admin serializer", () => {
		const result = userAdminSerializer(buildUser());

		assert.equal(result.email, "private@example.com");
		assert.equal(JSON.stringify(result).includes("hash"), false);
	});

	void it("include every visibility setting and theme in the me serializer", () => {
		const result = userMeSerializer(buildUser());

		assert.equal(result.queueVisibility, "friends");
		assert.equal(result.acceptFollowRequests, true);
		assert.equal(result.theme, "refined-dark");
	});

	void it("leave the public serializer with identity fields only", () => {
		assert.deepEqual(
			Object.keys(userPublicSerializer(buildUser())).sort(),
			["avatarUrl", "bio", "id", "name", "username"]
		);
	});
});

void describe("restrictedProfileSerializer", () => {
	void it("marks the profile private and exposes only public identity and follow state", () => {
		const result = restrictedProfileSerializer({
			kind: "restricted",
			user: buildUser({ profileVisibility: "private" }),
			followerCount: 3,
			followingCount: 4,
			isFollowing: false,
			hasPendingRequest: true
		});

		assert.equal(result.isPrivate, true);
		assert.equal(result.hasPendingRequest, true);
		assert.equal(result.acceptFollowRequests, true);
		assert.equal(leaksSensitiveData(result), false);
		assert.equal("backlogs" in result, false);
	});
});

void describe("fullProfileSerializer", () => {
	function buildFullProfile(isSelf: boolean) {
		return {
			kind: "full" as const,
			user: buildUser(),
			isSelf,
			backlogs: [buildBacklog()],
			backlogTotal: 1,
			backlogStats: {
				not_started: 0,
				playing: 0,
				completed: 1,
				abandoned: 0,
				endless: 0,
				total: 1
			},
			listsTotal: 2,
			recentActivity: [] as Activity[],
			followerCount: 1,
			followingCount: 1,
			isFollowing: false,
			access: {
				profile: true,
				queue: false,
				wishlist: false,
				favorite: true,
				feed: true,
				backlog: true,
				shelf: false,
				list: true,
				platinum: false
			}
		};
	}

	void it("keeps backlog notes when the viewer is the owner", () => {
		const result = fullProfileSerializer(buildFullProfile(true));

		assert.equal(result.backlogs[0] && "notes" in result.backlogs[0], true);
	});

	void it("removes backlog notes when someone else views the profile", () => {
		const result = fullProfileSerializer(buildFullProfile(false));

		assert.equal(
			result.backlogs[0] && "notes" in result.backlogs[0],
			false
		);
		assert.equal(JSON.stringify(result).includes("private notes"), false);
	});

	void it("does not expose the user's email nor acceptFollowRequests", () => {
		const result = fullProfileSerializer(buildFullProfile(false));

		assert.equal(leaksSensitiveData(result), false);
		assert.equal("acceptFollowRequests" in result.user, false);
	});
});

void describe("userCardSerializer", () => {
	void it("merges the summary with insights and the role", () => {
		const result = userCardSerializer({
			user: buildUser({ role: "premium" }),
			isSelf: false,
			followerCount: 5,
			isFollowing: true,
			gamesTotal: 10,
			completedTotal: 4,
			featuredGame: null,
			profileVisible: true
		});

		assert.equal(result.role, "premium");
		assert.equal(result.username, "player");
		assert.equal(result.completedTotal, 4);
		assert.equal(leaksSensitiveData(result), false);
	});
});

void describe("enrichedUserListSerializer", () => {
	void it("adds follower count and progress to the list summary", () => {
		const result = enrichedUserListSerializer({
			list: asModel({
				id: "l-1",
				name: "Mine",
				description: null,
				isPublic: true,
				scoreSource: "completr",
				durationSource: "hltb",
				User: { role: "admin" },
				ListItems: []
			}),
			followerCount: 7,
			progress: { completed: 1, total: 3 }
		});

		assert.equal(result.followerCount, 7);
		assert.deepEqual(result.progress, { completed: 1, total: 3 });
		assert.equal(result.isOfficial, true);
	});
});

void describe("userHighlightsSerializer", () => {
	function buildHighlights(isSelf: boolean): UserHighlightsBundle {
		const entry = { get: () => buildBacklog() };
		return asModel<UserHighlightsBundle>({
			isSelf,
			highlights: {
				recent: [entry],
				month: {
					startsAt: "2024-01-01",
					endsAt: "2024-01-31",
					completedCount: 2,
					longestPlayed: entry,
					bestPersonalRatio: entry,
					highestRated: null
				}
			}
		});
	}

	void it("serializes with notes for the owner and nulls missing highlights", () => {
		const { highlights } = userHighlightsSerializer(buildHighlights(true));

		assert.equal("notes" in highlights.recent[0]!, true);
		assert.equal(highlights.month.highestRated, null);
		assert.equal(highlights.month.completedCount, 2);
	});

	void it("hides notes from everyone else in recent and month highlights", () => {
		const { highlights } = userHighlightsSerializer(buildHighlights(false));

		assert.equal("notes" in highlights.recent[0]!, false);
		assert.equal("notes" in highlights.month.longestPlayed!, false);
		assert.equal("notes" in highlights.month.bestPersonalRatio!, false);
	});
});

void describe("userCompletionsSerializer", () => {
	function bundle(isSelf: boolean) {
		const backlog = buildBacklog();
		return {
			isSelf,
			rows: [backlog],
			reviewMap: new Map([["game-1", { content: "Great", rating: 5 }]]),
			total: 1
		};
	}

	void it("attaches the review of each game", () => {
		const { completions } = userCompletionsSerializer(bundle(true));

		assert.equal(completions[0]?.hasReview, true);
	});

	void it("hides notes when the viewer is not the owner", () => {
		const { completions, total } = userCompletionsSerializer(bundle(false));

		assert.equal("notes" in completions[0]!, false);
		assert.equal(total, 1);
	});
});

void describe("userReviewsSerializer", () => {
	void it("resolves the playthrough duration by user and game", () => {
		const result = userReviewsSerializer(
			asModel<UserReviewsBundle>({
				user: { id: "u-1" },
				reviewsPlain: [
					{
						id: "r-1",
						content: "x",
						rating: 4,
						Game: { id: "game-1", code: "g", title: "G" }
					},
					{
						id: "r-2",
						content: "y",
						rating: 3,
						Game: { id: "game-2", code: "h", title: "H" }
					}
				],
				durationMap: new Map([["u-1:game-1", 12]]),
				total: 2
			})
		);

		assert.equal(result.reviews[0]?.playthroughDuration, 12);
		assert.equal(result.reviews[1]?.playthroughDuration, null);
		assert.equal(result.total, 2);
	});
});
