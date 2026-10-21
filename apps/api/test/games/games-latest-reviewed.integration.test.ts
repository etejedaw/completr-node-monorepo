import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameGenre } from "../../src/game-genre/game-genre.model";
import { type Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { Review } from "../../src/reviews/review.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createScoreSource
} from "../helpers/factories.helper";

useTestDatabase(async () => {
	await createScoreSource({ code: "completr", scale: 5, priority: 5 });
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

function reviewAt(
	account: Account,
	game: Game,
	createdAt: string,
	review: { content?: string | null; rating?: number | null } = {
		content: "Great game"
	}
) {
	return Review.create({
		userId: account.user.id,
		gameId: game.id,
		content: review.content ?? null,
		rating: review.rating ?? null,
		createdAt
	});
}

function getLatestReviewed(authorization: string, query = "") {
	return api()
		.get(`/games/latest-reviewed${query}`)
		.set("Authorization", authorization);
}

function titlesOf(body: { data: { games: { title: string }[] } }) {
	return body.data.games.map(game => game.title);
}

void describe("GET /games/latest-reviewed", () => {
	void it("returns an empty list when nothing has been reviewed", async () => {
		const reader = await createUserWithSession();

		const response = await getLatestReviewed(reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { games: [] });
	});

	void it("lists games by their most recent review with the list fields", async () => {
		const reader = await createUserWithSession();
		const reviewer = await createUserWithSession();
		const [oldest, middle, newest] = await Promise.all([
			createGame({ title: "Reviewed Oldest" }),
			createGame({ title: "Reviewed Middle" }),
			createGame({ title: "Reviewed Newest" })
		]);
		const genre = await Genre.create({
			name: "Review Genre",
			code: "review-g"
		});
		await GameGenre.create({ gameId: middle.id, genreId: genre.id });
		await createGameScore(middle.id, "completr", 4);
		await createGameTime(middle.id, "completr", 10);
		await reviewAt(reviewer, oldest, "2024-01-01T00:00:00Z");
		await reviewAt(reviewer, middle, "2024-02-01T00:00:00Z");
		await reviewAt(reviewer, newest, "2024-03-01T00:00:00Z");

		const response = await getLatestReviewed(reader.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(titlesOf(response.body), [
			"Reviewed Newest",
			"Reviewed Middle",
			"Reviewed Oldest"
		]);
		const entry = response.body.data.games[1];
		assert.equal(entry.id, middle.id);
		assert.equal(entry.code, middle.code);
		assert.equal(entry.isDlc, false);
		assert.equal(entry.ratio, 8);
		assert.equal(entry.justImported, false);
		assert.deepEqual(
			entry.genres.map((item: { code: string }) => item.code),
			["review-g"]
		);
	});

	void it("lists a game once even when several users reviewed it, ranked by its latest review", async () => {
		const reader = await createUserWithSession();
		const [first, second] = await Promise.all([
			createUserWithSession(),
			createUserWithSession()
		]);
		const game = await createGame({ title: "Reviewed Twice" });
		const other = await createGame({ title: "Reviewed Once" });
		await reviewAt(first, game, "2025-01-01T00:00:00Z");
		await reviewAt(first, other, "2025-02-01T00:00:00Z");
		await reviewAt(second, game, "2025-03-01T00:00:00Z");

		const response = await getLatestReviewed(reader.authorization);

		const titles = titlesOf(response.body);
		assert.deepEqual(titles.slice(0, 2), [
			"Reviewed Twice",
			"Reviewed Once"
		]);
		assert.equal(
			titles.filter(title => title === "Reviewed Twice").length,
			1
		);
	});

	void it("ignores reviews without text content", async () => {
		const reader = await createUserWithSession();
		const reviewer = await createUserWithSession();
		const ratingOnly = await createGame({ title: "Rating Only Game" });
		const blank = await createGame({ title: "Blank Review Game" });
		const empty = await createGame({ title: "Empty Review Game" });
		await reviewAt(reviewer, ratingOnly, "2030-01-01T00:00:00Z", {
			rating: 4
		});
		await reviewAt(reviewer, blank, "2030-01-02T00:00:00Z", {
			content: "   ",
			rating: 3
		});
		await reviewAt(reviewer, empty, "2030-01-03T00:00:00Z", {
			content: ""
		});

		const response = await getLatestReviewed(reader.authorization);

		const titles = titlesOf(response.body);
		assert.equal(titles.includes("Rating Only Game"), false);
		assert.equal(titles.includes("Blank Review Game"), false);
		assert.equal(titles.includes("Empty Review Game"), false);
	});

	void it("omits inactive games", async () => {
		const reader = await createUserWithSession();
		const reviewer = await createUserWithSession();
		const retired = await createGame({
			title: "Retired Reviewed",
			isActive: false
		});
		await reviewAt(reviewer, retired, "2000-01-01T00:00:00Z");

		const response = await getLatestReviewed(reader.authorization);

		assert.equal(
			titlesOf(response.body).includes("Retired Reviewed"),
			false
		);
	});

	void it("honors the limit parameter", async () => {
		const reader = await createUserWithSession();

		const limited = await getLatestReviewed(
			reader.authorization,
			"?limit=2"
		);

		assert.equal(limited.status, 200);
		assert.equal(limited.body.data.games.length, 2);
	});

	void it("reflects a review written after a previous read", async () => {
		const reader = await createUserWithSession();
		const reviewer = await createUserWithSession();
		const game = await createGame({ title: "Just Reviewed" });

		const before = await getLatestReviewed(reader.authorization);
		await reviewAt(reviewer, game, "2040-01-01T00:00:00Z");
		const after = await getLatestReviewed(reader.authorization);

		assert.equal(titlesOf(before.body).includes("Just Reviewed"), false);
		assert.equal(titlesOf(after.body)[0], "Just Reviewed");
	});

	void it(
		"fills the limit with active games when the newest reviewed game is inactive",
		{
			todo: "bug: the limit is applied before inactive games are filtered out, so they take slots from the result"
		},
		async () => {
			const reader = await createUserWithSession();
			const reviewer = await createUserWithSession();
			const retired = await createGame({
				title: "Newest Retired",
				isActive: false
			});
			await reviewAt(reviewer, retired, "2050-01-01T00:00:00Z");

			const response = await getLatestReviewed(
				reader.authorization,
				"?limit=1"
			);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.games.length, 1);
		}
	);

	void it(
		"rejects a non-numeric limit with 422 COMMON_SCHEMA_INVALID",
		{
			todo: "bug: the limit query parameter is not validated, so a non-numeric value reaches the database"
		},
		async () => {
			const reader = await createUserWithSession();

			const response = await getLatestReviewed(
				reader.authorization,
				"?limit=abc"
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	);

	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await getLatestReviewed(account.authorization);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/games/latest-reviewed");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/games/latest-reviewed")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
