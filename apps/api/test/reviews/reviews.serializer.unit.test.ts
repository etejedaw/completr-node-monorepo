/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Review } from "../../src/reviews/review.model";
import {
	reviewSerializer,
	userReviewSerializer
} from "../../src/reviews/reviews.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildGame } from "../unit-helpers/builders";

const createdAt = new Date("2024-01-01");
const updatedAt = new Date("2024-02-01");

function buildReview(overrides: Record<string, unknown> = {}) {
	return asModel<Review>({
		id: "r-1",
		content: "Loved it",
		rating: 4.5,
		createdAt,
		updatedAt,
		User: {
			id: "u-1",
			username: "player",
			name: "Player",
			avatarUrl: null,
			role: "user",
			email: "private@example.com",
			passwordHash: "x"
		},
		Game: buildGame(),
		...overrides
	});
}

describe("reviewSerializer", () => {
	it("serializes the author without private fields", () => {
		const result = reviewSerializer(buildReview(), 12.5);

		assert.deepEqual(result.user, {
			id: "u-1",
			username: "player",
			name: "Player",
			avatarUrl: null,
			role: "user"
		});
		assert.equal(result.playthroughDuration, 12.5);
	});

	it("defaults playthroughDuration to null and user to null when not loaded", () => {
		const result = reviewSerializer(buildReview({ User: undefined }));

		assert.equal(result.playthroughDuration, null);
		assert.equal(result.user, null);
	});
});

describe("userReviewSerializer", () => {
	it("serializes the reviewed game instead of the author", () => {
		const result = userReviewSerializer(buildReview(), 8);

		assert.deepEqual(result.game, {
			id: "game-1",
			code: "hollow-knight",
			title: "Hollow Knight",
			coverUrl: "https://img/cover.jpg",
			backgroundUrl: "https://img/bg.jpg"
		});
		assert.equal("user" in result, false);
	});

	it("normalizes missing images to null and a missing game to null", () => {
		const noImages = userReviewSerializer(
			buildReview({
				Game: buildGame({
					coverUrl: undefined,
					backgroundUrl: undefined
				})
			})
		);

		assert.equal(noImages.game?.coverUrl, null);
		assert.equal(noImages.game?.backgroundUrl, null);
		assert.equal(
			userReviewSerializer(buildReview({ Game: undefined })).game,
			null
		);
	});
});
