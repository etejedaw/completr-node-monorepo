import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { Review } from "../../src/reviews/review.model";
import { type RewindRecapInput } from "../../src/rewind-recap/rewind-recap.interface";
import { buildRewindRecapContent } from "../../src/rewind-recap/utils/build-rewind-recap-content.util";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	generate,
	mockAiRecap,
	mockPremiumStats,
	readRewind,
	regenerationOf,
	signUpOn
} from "./rewind-generation.helper";

interface RecapPayload {
	games: { columns: string[]; rows: (string | number | null)[][] };
}

let platform: Platform;
let games: Record<"hades" | "celeste" | "secret" | "unplayed", Game>;

function writeReview(account: Account, game: Game, content: string | null) {
	return Review.create({
		userId: account.user.id,
		gameId: game.id,
		content,
		rating: 4
	});
}

function lastInput(aiMock: ReturnType<typeof mockAiRecap>): RewindRecapInput {
	return aiMock.mock.calls.at(-1)?.arguments[0] as RewindRecapInput;
}

function serializedRecap(input: RewindRecapInput): string {
	return buildRewindRecapContent(input, new Date("2026-12-15T00:00:00.000Z"));
}

function reviewColumn(input: RewindRecapInput): Record<string, unknown> {
	const payload = JSON.parse(serializedRecap(input)) as RecapPayload;
	const titleIndex = payload.games.columns.indexOf("title");
	const reviewIndex = payload.games.columns.indexOf("review");
	return Object.fromEntries(
		payload.games.rows.map(row => [
			String(row[titleIndex]),
			row[reviewIndex] ?? null
		])
	);
}

async function reviewerYear() {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
	await addRun(player, games.hades, platform, {
		startedAt: "2026-02-01",
		finishedAt: "2026-03-10"
	});
	await addRun(player, games.celeste, platform, {
		startedAt: "2026-04-01",
		finishedAt: "2026-04-20"
	});
	await addRun(player, games.secret, platform, {
		startedAt: "2026-05-01",
		finishedAt: "2026-05-30",
		isPublic: false
	});
	await writeReview(
		player,
		games.hades,
		"HADES-REVIEW the combat never gets old"
	);
	await writeReview(player, games.celeste, "   \n\t ");
	await writeReview(player, games.secret, "SECRET-REVIEW hidden run");
	await writeReview(
		player,
		games.unplayed,
		"UNPLAYED-REVIEW never started it"
	);
	return player;
}

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		secret: await createGame({ title: "Secret Game" }),
		unplayed: await createGame({ title: "Unplayed" })
	};
});

afterEach(() => {
	mock.restoreAll();
});

void describe("reviews in the AI recap", () => {
	void it("sends the written reviews of the year's public games without asking for notes", async () => {
		const player = await reviewerYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026).expect(201);

		const input = lastInput(aiMock);
		assert.equal(input.includesNotes, false);
		assert.deepEqual(reviewColumn(input), {
			Hades: "HADES-REVIEW the combat never gets old",
			Celeste: null
		});
		const serialized = serializedRecap(input);
		assert.doesNotMatch(serialized, /SECRET-REVIEW|UNPLAYED-REVIEW/);
	});

	void it("adds the review of a private run only when private runs are included", async () => {
		const player = await reviewerYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, {
				includePrivateRuns: true
			})
		).expect(200);

		assert.equal(
			reviewColumn(lastInput(aiMock))["Secret Game"],
			"SECRET-REVIEW hidden run"
		);
		assert.doesNotMatch(
			serializedRecap(lastInput(aiMock)),
			/UNPLAYED-REVIEW/
		);
	});

	void it("uses the latest text when the review changes between generations", async () => {
		const player = await reviewerYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		await Review.update(
			{ content: "HADES-EDITED changed my mind" },
			{ where: { userId: player.user.id, gameId: games.hades.id } }
		);
		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);

		assert.equal(
			reviewColumn(lastInput(aiMock)).Hades,
			"HADES-EDITED changed my mind"
		);
	});

	void it("drops a review deleted between generations", async () => {
		const player = await reviewerYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		await Review.destroy({
			where: { userId: player.user.id, gameId: games.hades.id }
		});
		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);

		assert.equal(reviewColumn(lastInput(aiMock)).Hades, null);
		assert.doesNotMatch(serializedRecap(lastInput(aiMock)), /HADES-REVIEW/);
	});

	void it("never returns the reviews from the Rewind response", async () => {
		const player = await reviewerYear();
		mockPremiumStats();
		mockAiRecap();

		const generated = await generate(player, 2026).expect(201);
		const read = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);

		for (const body of [generated.body, read.body])
			assert.doesNotMatch(JSON.stringify(body), /HADES-REVIEW/);
	});
});
