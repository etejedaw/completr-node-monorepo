import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GameReport } from "../../src/game-reports/game-report.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

const NON_EXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 1000;
const VALID_MESSAGE = "The score of this game looks wrong";

function postReport(account: Account, gameId: string, body: unknown) {
	return api()
		.post(`/games/${gameId}/reports`)
		.set("Authorization", account.authorization)
		.send(body as object);
}

void describe("POST /games/:id/reports", () => {
	void it("creates a pending general report as a regular user", async () => {
		const reporter = await createUserWithSession("user");
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 201);
		const { report } = response.body.data;
		assert.match(report.id, /^[0-9a-f-]{36}$/);
		assert.equal(report.gameId, game.id);
		assert.equal(report.userId, reporter.user.id);
		assert.equal(report.message, VALID_MESSAGE);
		assert.equal(report.category, "general");
		assert.equal(report.status, "pending");
		assert.ok(!Number.isNaN(Date.parse(report.createdAt)));
	});

	void it("persists the report in the database", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "missing_duration"
		}).expect(201);

		const stored = await GameReport.findByPk(response.body.data.report.id);
		assert.equal(stored?.gameId, game.id);
		assert.equal(stored?.userId, reporter.user.id);
		assert.equal(stored?.message, VALID_MESSAGE);
		assert.equal(stored?.category, "missing_duration");
		assert.equal(stored?.status, "pending");
	});

	void it("accepts every report category", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		for (const category of [
			"general",
			"missing_score",
			"missing_duration"
		]) {
			const response = await postReport(reporter, game.id, {
				message: VALID_MESSAGE,
				category
			});

			assert.equal(response.status, 201);
			assert.equal(response.body.data.report.category, category);
		}
		assert.equal(
			await GameReport.count({
				where: { gameId: game.id, userId: reporter.user.id }
			}),
			3
		);
	});

	void it("accepts a premium user", async () => {
		const reporter = await createUserWithSession("premium");
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 201);
	});

	void it("accepts messages at the minimum and maximum length", async () => {
		const reporter = await createUserWithSession();
		const shortGame = await createGame();
		const longGame = await createGame();

		const shortResponse = await postReport(reporter, shortGame.id, {
			message: "a".repeat(MIN_MESSAGE_LENGTH)
		});
		const longResponse = await postReport(reporter, longGame.id, {
			message: "a".repeat(MAX_MESSAGE_LENGTH)
		});

		assert.equal(shortResponse.status, 201);
		assert.equal(longResponse.status, 201);
	});

	void it("rejects a message shorter than the minimum with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: "a".repeat(MIN_MESSAGE_LENGTH - 1)
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects a message longer than the maximum with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: "a".repeat(MAX_MESSAGE_LENGTH + 1)
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects a message made only of whitespace with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: " ".repeat(MIN_MESSAGE_LENGTH)
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects a message that falls under the minimum once trimmed with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: `   ${"a".repeat(MIN_MESSAGE_LENGTH - 1)}   `
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("stores a valid message trimmed of surrounding whitespace", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: `  \n${VALID_MESSAGE}\t  `
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.report.message, VALID_MESSAGE);
		const stored = await GameReport.findByPk(response.body.data.report.id);
		assert.equal(stored?.message, VALID_MESSAGE);
	});

	void it("counts the length of the trimmed message against the maximum", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: ` ${"a".repeat(MAX_MESSAGE_LENGTH)} `
		});

		assert.equal(response.status, 201);
		assert.equal(
			response.body.data.report.message,
			"a".repeat(MAX_MESSAGE_LENGTH)
		);
	});

	void it("rejects a body without message with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {});

		assert.equal(response.status, 422);
	});

	void it("rejects a message that is not a string with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: 1234567890
		});

		assert.equal(response.status, 422);
	});

	void it("rejects an unknown category with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "spam"
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects unknown fields in the body with 422", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			status: "approved"
		});

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects a game id that is not a UUID with 422", async () => {
		const reporter = await createUserWithSession();

		const response = await postReport(reporter, "not-a-uuid", {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 422);
	});

	void it("returns 404 for a game that does not exist", async () => {
		const reporter = await createUserWithSession();

		const response = await postReport(reporter, NON_EXISTENT_ID, {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_REPORT_GAME_NOT_FOUND");
		assert.equal(
			await GameReport.count({ where: { userId: reporter.user.id } }),
			0
		);
	});

	void it("returns 409 when the same user repeats a report for the same game and category", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();
		await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "missing_score"
		}).expect(201);

		const response = await postReport(reporter, game.id, {
			message: "Another message about the same problem",
			category: "missing_score"
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_REPORT_ALREADY_REPORTED");
		assert.equal(
			await GameReport.count({
				where: { gameId: game.id, userId: reporter.user.id }
			}),
			1
		);
	});

	void it("treats an omitted category as general when detecting duplicates", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();
		await postReport(reporter, game.id, { message: VALID_MESSAGE }).expect(
			201
		);

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "general"
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_REPORT_ALREADY_REPORTED");
	});

	void it("allows the same user to report the same game under a different category", async () => {
		const reporter = await createUserWithSession();
		const game = await createGame();
		await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "missing_score"
		}).expect(201);

		const response = await postReport(reporter, game.id, {
			message: VALID_MESSAGE,
			category: "missing_duration"
		});

		assert.equal(response.status, 201);
	});

	void it("allows the same user to report a different game with the same category", async () => {
		const reporter = await createUserWithSession();
		const firstGame = await createGame();
		const secondGame = await createGame();
		await postReport(reporter, firstGame.id, {
			message: VALID_MESSAGE
		}).expect(201);

		const response = await postReport(reporter, secondGame.id, {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 201);
	});

	void it("allows different users to report the same game and category", async () => {
		const firstReporter = await createUserWithSession();
		const secondReporter = await createUserWithSession();
		const game = await createGame();
		await postReport(firstReporter, game.id, {
			message: VALID_MESSAGE
		}).expect(201);

		const response = await postReport(secondReporter, game.id, {
			message: VALID_MESSAGE
		});

		assert.equal(response.status, 201);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 2);
	});

	void it("rejects a request without credentials", async () => {
		const game = await createGame();

		const response = await api()
			.post(`/games/${game.id}/reports`)
			.send({ message: VALID_MESSAGE });

		assert.equal(response.status, 422);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects an invalid token with 401", async () => {
		const game = await createGame();

		const response = await api()
			.post(`/games/${game.id}/reports`)
			.set("Authorization", "Bearer invalid-token")
			.send({ message: VALID_MESSAGE });

		assert.equal(response.status, 401);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});
});
