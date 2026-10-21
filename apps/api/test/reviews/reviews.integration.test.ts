import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Review } from "../../src/reviews/review.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

useTestDatabase();

function reviewsPath(gameId: string) {
	return `/games/${gameId}/reviews`;
}

function postReview(
	authorization: string,
	gameId: string,
	body: Record<string, unknown>
) {
	return api()
		.post(reviewsPath(gameId))
		.set("Authorization", authorization)
		.send(body);
}

async function getReviews(authorization: string, gameId: string) {
	const response = await api()
		.get(reviewsPath(gameId))
		.set("Authorization", authorization)
		.expect(200);
	return response.body.data.reviews as {
		id: string;
		content: string | null;
		rating: number | null;
		playthroughDuration: number | null;
		user: { username: string };
	}[];
}

void describe("POST /games/:id/reviews", () => {
	void it("creates a review with content and rating", async () => {
		const author = await createUserWithSession();
		const game = await createGame();

		const response = await postReview(author.authorization, game.id, {
			content: "A masterpiece",
			rating: 4.5
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.review.content, "A masterpiece");
		assert.equal(response.body.data.review.rating, 4.5);
		const reviews = await getReviews(author.authorization, game.id);
		assert.deepEqual(
			reviews.map(review => review.user.username),
			[author.user.username]
		);
	});

	void it("creates a rating-only review", async () => {
		const author = await createUserWithSession();
		const game = await createGame();

		const response = await postReview(author.authorization, game.id, {
			rating: 3
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.review.content, null);
	});

	for (const [description, body] of [
		["an empty body", {}],
		["a rating above 5", { rating: 5.5 }],
		["an empty content", { content: "" }]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const author = await createUserWithSession();
			const game = await createGame();

			const response = await postReview(
				author.authorization,
				game.id,
				body
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const author = await createUserWithSession();

		const response = await postReview(author.authorization, "not-a-uuid", {
			rating: 4
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("answers 404 REVIEW_GAME_NOT_FOUND for an unknown game", async () => {
		const author = await createUserWithSession();

		const response = await postReview(author.authorization, randomUUID(), {
			rating: 4
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "REVIEW_GAME_NOT_FOUND");
	});

	void it("rejects a second review of the same game with 409 REVIEW_ALREADY_EXISTS", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await postReview(author.authorization, game.id, { rating: 4 }).expect(
			201
		);

		const response = await postReview(author.authorization, game.id, {
			content: "Again"
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REVIEW_ALREADY_EXISTS");
		assert.equal(
			await Review.count({
				where: { userId: author.user.id, gameId: game.id }
			}),
			1
		);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await postReview("Bearer invalid", randomUUID(), {
			rating: 4
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /games/:id/reviews", () => {
	void it("exposes the playthrough duration of the author's last completed run", async () => {
		const author = await createUserWithSession();
		const viewer = await createUserWithSession();
		const game = await createGame();
		const backlog = await createBacklog(
			author.user.id,
			game.id,
			(await createPlatform()).id,
			{ status: "completed" }
		);
		await backlog.update({ realDuration: 27 });
		await postReview(author.authorization, game.id, {
			content: "Worth it"
		}).expect(201);
		await postReview(viewer.authorization, game.id, { rating: 2 }).expect(
			201
		);

		const reviews = await getReviews(viewer.authorization, game.id);

		const byAuthor = new Map(
			reviews.map(review => [
				review.user.username,
				review.playthroughDuration
			])
		);
		assert.equal(byAuthor.get(author.user.username), 27);
		assert.equal(byAuthor.get(viewer.user.username), null);
	});
});

void describe("PATCH and DELETE /games/:id/reviews", () => {
	void it("updates the caller's review", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await postReview(author.authorization, game.id, {
			content: "First take",
			rating: 3
		}).expect(201);

		const response = await api()
			.patch(reviewsPath(game.id))
			.set("Authorization", author.authorization)
			.send({ content: "Second take", rating: null });

		assert.equal(response.status, 200);
		const [review] = await getReviews(author.authorization, game.id);
		assert.equal(review!.content, "Second take");
		assert.equal(review!.rating, null);
	});

	void it("answers 404 REVIEW_NOT_FOUND when the caller has no review, leaving other reviews intact", async () => {
		const author = await createUserWithSession();
		const intruder = await createUserWithSession();
		const game = await createGame();
		await postReview(author.authorization, game.id, {
			content: "Mine"
		}).expect(201);

		const patched = await api()
			.patch(reviewsPath(game.id))
			.set("Authorization", intruder.authorization)
			.send({ content: "Hijacked" });
		assert.equal(patched.status, 404);
		assert.equal(patched.body.type, "REVIEW_NOT_FOUND");

		const deleted = await api()
			.delete(reviewsPath(game.id))
			.set("Authorization", intruder.authorization);
		assert.equal(deleted.status, 404);
		assert.equal(deleted.body.type, "REVIEW_NOT_FOUND");

		const [review] = await getReviews(author.authorization, game.id);
		assert.equal(review!.content, "Mine");
	});

	void it("deletes the caller's review", async () => {
		const author = await createUserWithSession();
		const game = await createGame();
		await postReview(author.authorization, game.id, { rating: 4 }).expect(
			201
		);

		const response = await api()
			.delete(reviewsPath(game.id))
			.set("Authorization", author.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(await getReviews(author.authorization, game.id), []);
	});
});

void describe("GET /users/:username/reviews", () => {
	void it("lists the author's reviews with their games", async () => {
		const author = await createUserWithSession();
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await postReview(author.authorization, first.id, {
			content: "Great"
		}).expect(201);
		await postReview(author.authorization, second.id, { rating: 4 }).expect(
			201
		);

		const response = await api().get(
			`/users/${author.user.username}/reviews`
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		assert.deepEqual(
			new Set(
				response.body.data.reviews.map(
					(review: { game: { id: string } }) => review.game.id
				)
			),
			new Set([first.id, second.id])
		);
	});
});
