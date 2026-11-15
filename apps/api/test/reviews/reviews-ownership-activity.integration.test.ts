import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { Review } from "../../src/reviews/review.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createGame } from "../helpers/factories.helper";

useTestDatabase();

function reviewActivities(userId: string) {
	return Activity.count({ where: { userId, type: "game_reviewed" } });
}

async function waitForActivities(userId: string, expected: number) {
	await eventually(async () => {
		assert.equal(await reviewActivities(userId), expected);
	});
}

function patchReview(
	authorization: string,
	gameId: string,
	body: Record<string, unknown>
) {
	return api()
		.patch(`/games/${gameId}/reviews`)
		.set("Authorization", authorization)
		.send(body);
}

void describe("review edits and deletions", () => {
	void it("answers 404 REVIEW_NOT_FOUND for someone who never reviewed the game and keeps the review of others", async () => {
		const author = await createUserWithSession();
		const intruder = await createUserWithSession();
		const game = await createGame();
		await Review.create({
			userId: author.user.id,
			gameId: game.id,
			content: "Great",
			rating: 4
		});

		const patched = await patchReview(intruder.authorization, game.id, {
			content: "Hijacked"
		});
		const deleted = await api()
			.delete(`/games/${game.id}/reviews`)
			.set("Authorization", intruder.authorization);

		assert.equal(patched.status, 404);
		assert.equal(patched.body.type, "REVIEW_NOT_FOUND");
		assert.equal(deleted.status, 404);
		assert.equal(deleted.body.type, "REVIEW_NOT_FOUND");
		const stored = await Review.findOne({
			where: { userId: author.user.id, gameId: game.id }
		});
		assert.equal(stored?.content, "Great");
	});

	void it("records the activity only when the review actually changes", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await api()
			.post(`/games/${game.id}/reviews`)
			.set("Authorization", author.authorization)
			.send({ content: "First take", rating: 3 })
			.expect(201);
		await waitForActivities(author.user.id, 1);

		await patchReview(author.authorization, game.id, {
			content: "First take",
			rating: 3
		}).expect(200);
		await patchReview(author.authorization, game.id, {
			content: "Second take"
		}).expect(200);
		await waitForActivities(author.user.id, 2);

		await patchReview(author.authorization, game.id, {
			content: "Second take"
		}).expect(200);
		await patchReview(author.authorization, game.id, {
			rating: 5
		}).expect(200);
		await waitForActivities(author.user.id, 3);
		assert.equal(await reviewActivities(author.user.id), 3);
	});

	void it("answers 404 when two deletes race for the same review", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await Review.create({
			userId: author.user.id,
			gameId: game.id,
			content: "Gone soon"
		});

		const responses = await Promise.all(
			[0, 1].map(() =>
				api()
					.delete(`/games/${game.id}/reviews`)
					.set("Authorization", author.authorization)
			)
		);

		assert.deepEqual(responses.map(r => r.status).sort(), [204, 404]);
	});

	void it("rejects garbage bodies with 422 and keeps the review", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await Review.create({
			userId: author.user.id,
			gameId: game.id,
			content: "Stable",
			rating: 2
		});

		const response = await patchReview(author.authorization, game.id, {
			rating: "five",
			content: 12
		});

		assert.equal(response.status, 422);
		const stored = await Review.findOne({
			where: { userId: author.user.id, gameId: game.id }
		});
		assert.equal(stored?.content, "Stable");
	});
});
