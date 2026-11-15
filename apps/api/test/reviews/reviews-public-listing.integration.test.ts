import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

const REVIEWERS = 5;

useTestDatabase();

function getReviews(authorization: string, gameId: string, query = "") {
	return api()
		.get(`/games/${gameId}/reviews${query}`)
		.set("Authorization", authorization);
}

async function reviewGame(
	author: { authorization: string },
	gameId: string,
	content: string
) {
	await api()
		.post(`/games/${gameId}/reviews`)
		.set("Authorization", author.authorization)
		.send({ content })
		.expect(201);
}

async function completedBacklog(userId: string, gameId: string) {
	const backlog = await createBacklog(
		userId,
		gameId,
		(await createPlatform()).id,
		{ status: "completed" }
	);
	await backlog.update({ realDuration: 33 });
}

void describe("GET /games/:id/reviews as a public listing", () => {
	void it("lists the review of an author with a private profile", async () => {
		const author = await createUserWithSession();
		const viewer = await createUserWithSession();
		const game = await createGame();
		await User.update(
			{ profileVisibility: "private", backlogVisibility: "private" },
			{ where: { id: author.user.id } }
		);
		await reviewGame(author, game.id, "Still public");

		const response = await getReviews(viewer.authorization, game.id);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.reviews.length, 1);
		assert.equal(response.body.data.total, 1);
	});

	void it("leaves out the reviews of deactivated authors", async () => {
		const active = await createUserWithSession();
		const inactive = await createUserWithSession();
		const viewer = await createUserWithSession();
		const game = await createGame();
		await reviewGame(active, game.id, "Here");
		await reviewGame(inactive, game.id, "Gone");
		await User.update(
			{ isActive: false },
			{ where: { id: inactive.user.id } }
		);

		const response = await getReviews(viewer.authorization, game.id);

		assert.equal(response.body.data.total, 1);
		assert.deepEqual(
			response.body.data.reviews.map(
				(review: { user: { username: string } }) => review.user.username
			),
			[active.user.username]
		);
	});

	void it("attaches the playthrough duration only when the author's backlog is visible to the viewer", async () => {
		const publicAuthor = await createUserWithSession();
		const privateAuthor = await createUserWithSession();
		const viewer = await createUserWithSession();
		const game = await createGame();
		await User.update(
			{ backlogVisibility: "private" },
			{ where: { id: privateAuthor.user.id } }
		);
		for (const author of [publicAuthor, privateAuthor]) {
			await completedBacklog(author.user.id, game.id);
			await reviewGame(author, game.id, "Done");
		}

		const asViewer = await getReviews(viewer.authorization, game.id);
		const asPrivateAuthor = await getReviews(
			privateAuthor.authorization,
			game.id
		);

		const durationByUser = (response: typeof asViewer) =>
			new Map(
				response.body.data.reviews.map(
					(review: {
						user: { username: string };
						playthroughDuration: number | null;
					}) => [review.user.username, review.playthroughDuration]
				)
			);
		assert.equal(
			durationByUser(asViewer).get(publicAuthor.user.username),
			33
		);
		assert.equal(
			durationByUser(asViewer).get(privateAuthor.user.username),
			null
		);
		assert.equal(
			durationByUser(asPrivateAuthor).get(privateAuthor.user.username),
			33
		);
	});

	void it("paginates the reviews and reports the total", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		for (let index = 0; index < REVIEWERS; index++)
			await reviewGame(
				await createUserWithSession(),
				game.id,
				`Review ${index}`
			);

		const first = await getReviews(
			viewer.authorization,
			game.id,
			"?limit=2&offset=0"
		);
		const last = await getReviews(
			viewer.authorization,
			game.id,
			"?limit=2&offset=4"
		);

		assert.equal(first.body.data.reviews.length, 2);
		assert.equal(first.body.data.total, REVIEWERS);
		assert.equal(last.body.data.reviews.length, 1);
	});

	void it("rejects garbage pagination with 422", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();

		for (const query of [
			"?limit=0",
			"?limit=101",
			"?offset=-5",
			"?offset=x"
		]) {
			const response = await getReviews(
				viewer.authorization,
				game.id,
				query
			);
			assert.equal(response.status, 422, query);
		}
	});
});
