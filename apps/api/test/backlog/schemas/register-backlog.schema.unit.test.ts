import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RegisterBacklogSchema } from "../../../src/backlog/schemas/register-backlog.schema";

const GAME_ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const PLATFORM_ID = "1c2d3e4f-5061-4b7c-9d8e-0f1a2b3c4d5e";

const validRegistration = {
	gameId: GAME_ID,
	platformId: PLATFORM_ID,
	score: 4.5,
	duration: 12.5
};

void describe("RegisterBacklogSchema", () => {
	void it("accepts the minimal valid payload", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse(validRegistration).success,
			true
		);
	});

	void it("requires score and duration", () => {
		const { score: _score, ...withoutScore } = validRegistration;
		const { duration: _duration, ...withoutDuration } = validRegistration;

		assert.equal(
			RegisterBacklogSchema.safeParse(withoutScore).success,
			false
		);
		assert.equal(
			RegisterBacklogSchema.safeParse(withoutDuration).success,
			false
		);
	});

	void it("rejects unknown statuses", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				status: "dropped"
			}).success,
			false
		);
	});

	void it("accepts every backlog status", () => {
		for (const status of [
			"not_started",
			"playing",
			"completed",
			"abandoned",
			"endless"
		]) {
			assert.equal(
				RegisterBacklogSchema.safeParse({
					...validRegistration,
					status
				}).success,
				true,
				status
			);
		}
	});

	void it("accepts userRating in half point steps between 0.5 and 5", () => {
		for (const userRating of [0.5, 3, 4.5, 5]) {
			assert.equal(
				RegisterBacklogSchema.safeParse({
					...validRegistration,
					userRating
				}).success,
				true,
				String(userRating)
			);
		}
	});

	void it("rejects userRating outside 0.5-5 or off the half point step", () => {
		for (const userRating of [0, 0.25, 3.3, 5.5]) {
			assert.equal(
				RegisterBacklogSchema.safeParse({
					...validRegistration,
					userRating
				}).success,
				false,
				String(userRating)
			);
		}
	});

	void it("rejects dates that are not ISO calendar dates", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				startedAt: "01/02/2024"
			}).success,
			false
		);
	});

	void it("rejects unknown fields", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				userId: GAME_ID
			}).success,
			false
		);
	});

	void it("rejects a non positive realDuration", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				realDuration: 0
			}).success,
			false
		);
	});

	void it("accepts the optional extras of the creation modal", () => {
		const result = RegisterBacklogSchema.safeParse({
			...validRegistration,
			status: "completed",
			addToQueue: false,
			addToShelf: true,
			moodTags: [" cozy "],
			review: { content: " Great run ", rating: 4.5 },
			progressNote: " Chapter 3 "
		});

		assert.equal(result.success, true);
		assert.deepEqual(result.data?.moodTags, ["cozy"]);
		assert.deepEqual(result.data?.review, {
			content: "Great run",
			rating: 4.5
		});
		assert.equal(result.data?.progressNote, "Chapter 3");
	});

	void it("rejects a review without content nor rating", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				status: "completed",
				review: { content: "   " }
			}).success,
			false
		);
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				status: "completed",
				review: {}
			}).success,
			false
		);
	});

	void it("only accepts a review for completed, abandoned or endless entries", () => {
		for (const status of [undefined, "not_started", "playing"]) {
			assert.equal(
				RegisterBacklogSchema.safeParse({
					...validRegistration,
					status,
					review: { rating: 4 }
				}).success,
				false
			);
		}
		for (const status of ["completed", "abandoned", "endless"]) {
			assert.equal(
				RegisterBacklogSchema.safeParse({
					...validRegistration,
					status,
					review: { rating: 4 }
				}).success,
				true
			);
		}
	});

	void it("rejects more than 10 mood tags and an empty progress note", () => {
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				moodTags: Array.from({ length: 11 }, (_, i) => `tag ${i}`)
			}).success,
			false
		);
		assert.equal(
			RegisterBacklogSchema.safeParse({
				...validRegistration,
				progressNote: "  "
			}).success,
			false
		);
	});
});
