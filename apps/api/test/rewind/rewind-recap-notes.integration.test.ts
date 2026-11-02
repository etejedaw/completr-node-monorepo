import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { type RewindRecapInput } from "../../src/rewind-recap/rewind-recap.interface";
import { buildRewindRecapContent } from "../../src/rewind-recap/utils/build-rewind-recap-content.util";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createFranchise,
	createGame,
	createPlatform
} from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	FIRST_GENERATION,
	generate,
	mockAiRecap,
	mockPremiumStats,
	readRewind,
	readRewindYears,
	regenerationOf,
	requestAiRecap,
	signUpOn
} from "./rewind-generation.helper";

const PUBLIC_NOTE = "PUBLIC-NOTE beat it with my brother Tomás <b>twice</b> 🎮";
const PRIVATE_NOTE = "PRIVATE-NOTE played while my dog was sick";
const OLD_NOTE = "OLD-NOTE last year's diary";
const NOTE_MARKERS = /PUBLIC-NOTE|PRIVATE-NOTE|OLD-NOTE|Tomás|dog was sick/;

let platform: Platform;
let games: Record<"hades" | "celeste" | "secret", Game>;

async function playerWithNotes(role: Account["user"]["role"] = "premium") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, games.hades, platform, {
		startedAt: "2026-02-01",
		finishedAt: "2026-03-10",
		realDuration: 20,
		notes: PUBLIC_NOTE
	});
	await addRun(player, games.secret, platform, {
		startedAt: "2026-04-01",
		finishedAt: "2026-05-05",
		realDuration: 50,
		isPublic: false,
		notes: PRIVATE_NOTE
	});
	await addRun(player, games.celeste, platform, {
		finishedAt: "2025-07-07",
		realDuration: 8,
		notes: OLD_NOTE
	});
	return player;
}

function lastInput(aiMock: ReturnType<typeof mockAiRecap>): RewindRecapInput {
	const call = aiMock.mock.calls.at(-1);
	return call?.arguments[0] as RewindRecapInput;
}

function notesOf(input: RewindRecapInput): string[] {
	return input.runs.flatMap(run => (run.notes === null ? [] : [run.notes]));
}

function serializedRecap(input: RewindRecapInput): string {
	return buildRewindRecapContent(input, new Date("2026-12-15T00:00:00.000Z"));
}

function assertNoNotes(body: unknown, label: string) {
	const serialized = JSON.stringify(body);
	assert.doesNotMatch(serialized, NOTE_MARKERS, label);
	assert.doesNotMatch(serialized, /"notes"/, label);
}

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		secret: await createGame({ title: "Secret Game" })
	};
});

afterEach(() => {
	mock.restoreAll();
});

void describe("notes in the AI recap", () => {
	void it("keeps notes out of the AI input when the owner did not opt in", async () => {
		const player = await playerWithNotes();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const response = await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true
		}).expect(201);

		const input = lastInput(aiMock);
		assert.equal(input.includesNotes, false);
		assert.deepEqual(notesOf(input), []);
		assert.doesNotMatch(serializedRecap(input), NOTE_MARKERS);
		assert.doesNotMatch(serializedRecap(input), /"notes"/);
		assert.equal(response.body.data.ownerControls.includesNotes, false);
		assert.equal((await findRewindRow(player, 2026))?.includesNotes, false);
	});

	void it("sends every note to the AI when the owner opts in with private runs", async () => {
		const player = await playerWithNotes();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const response = await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true,
			includeNotes: true
		}).expect(201);

		const input = lastInput(aiMock);
		assert.equal(input.includesNotes, true);
		assert.deepEqual(notesOf(input).sort(), [
			OLD_NOTE,
			PRIVATE_NOTE,
			PUBLIC_NOTE
		]);
		const content = serializedRecap(input);
		assert.match(content, /PUBLIC-NOTE beat it with my brother Tomás/);
		assert.match(content, /PRIVATE-NOTE/);
		assert.equal(response.body.data.ownerControls.includesNotes, true);
		assertNoNotes(response.body, "generate response");
	});

	void it("sends only the notes of public runs when private runs stay out", async () => {
		const player = await playerWithNotes();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026, {
			...FIRST_GENERATION,
			includeNotes: true
		}).expect(201);

		const input = lastInput(aiMock);
		assert.deepEqual(notesOf(input).sort(), [OLD_NOTE, PUBLIC_NOTE]);
		assert.equal(JSON.stringify(input).includes("PRIVATE-NOTE"), false);
		assert.equal(JSON.stringify(input).includes("Secret"), false);
	});

	void it("turns the notes on when regenerating", async () => {
		const player = await playerWithNotes();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		assert.deepEqual(notesOf(lastInput(aiMock)), []);

		const withNotes = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, { includeNotes: true })
		).expect(200);
		assert.equal(withNotes.body.data.ownerControls.includesNotes, true);
		assert.equal((await findRewindRow(player, 2026))?.includesNotes, true);
		assert.deepEqual(notesOf(lastInput(aiMock)).sort(), [
			OLD_NOTE,
			PUBLIC_NOTE
		]);
	});

	void it("lets a regeneration turn the notes off again", async () => {
		const player = await playerWithNotes();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026, {
			...FIRST_GENERATION,
			includeNotes: true
		}).expect(201);
		const regenerated = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, { includeNotes: false })
		).expect(200);

		assert.equal(regenerated.body.data.ownerControls.includesNotes, false);
		assert.equal((await findRewindRow(player, 2026))?.includesNotes, false);
		assert.equal(aiMock.mock.callCount(), 2);
		assert.deepEqual(notesOf(lastInput(aiMock)), []);
	});

	void it("uses the stored choice when the AI recap is retried", async () => {
		for (const includeNotes of [true, false]) {
			const player = await playerWithNotes();
			mockPremiumStats();
			const aiMock = mockAiRecap(() =>
				Promise.reject(new Error("timeout"))
			);
			await generate(player, 2026, {
				...FIRST_GENERATION,
				includeNotes
			}).expect(201);

			aiMock.mock.mockImplementation(() =>
				Promise.resolve({
					headline: "h",
					summary: "s",
					insights: [],
					funFact: "f",
					nextYearChallenge: "n"
				})
			);
			const retry = await requestAiRecap(player, 2026).expect(200);

			const input = lastInput(aiMock);
			assert.equal(input.includesNotes, includeNotes);
			assert.deepEqual(
				notesOf(input).sort(),
				includeNotes ? [OLD_NOTE, PUBLIC_NOTE] : []
			);
			assert.equal(
				retry.body.data.ownerControls.includesNotes,
				includeNotes
			);
			assertNoNotes(retry.body, "ai-recap response");
			mock.restoreAll();
		}
	});

	void it("uses the stored choice of a free owner who becomes premium", async () => {
		const player = await playerWithNotes("user");
		mockPremiumStats();
		const aiMock = mockAiRecap();
		await generate(player, 2026, {
			...FIRST_GENERATION,
			includeNotes: true
		}).expect(201);
		assert.equal(aiMock.mock.callCount(), 0);

		await player.user.update({ role: "premium" });
		await requestAiRecap(player, 2026).expect(200);

		assert.deepEqual(notesOf(lastInput(aiMock)).sort(), [
			OLD_NOTE,
			PUBLIC_NOTE
		]);
	});

	void it("never returns notes from any Rewind endpoint", async () => {
		const player = await playerWithNotes();
		const stranger = await createUserWithSession();
		mockPremiumStats();
		mockAiRecap();

		const first = await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true,
			includeNotes: true
		}).expect(201);
		assertNoNotes(first.body, "generate");

		const regenerated = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, {
				includePrivateRuns: true,
				includeNotes: true
			})
		).expect(200);
		assertNoNotes(regenerated.body, "regenerate");

		for (const authorization of [
			undefined,
			stranger.authorization,
			player.authorization
		]) {
			const detail = await readRewind(
				player.user.username,
				2026,
				authorization
			).expect(200);
			assertNoNotes(detail.body, `detail ${String(authorization)}`);
			const years = await readRewindYears(
				player.user.username,
				authorization
			).expect(200);
			assertNoNotes(years.body, `years ${String(authorization)}`);
		}
	});

	void it("passes the franchise of each active game to the AI", async () => {
		const player = await playerWithNotes();
		const franchise = await createFranchise({ name: "Roguelites" });
		await games.hades.update({ franchiseId: franchise.id });
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026).expect(201);

		const input = lastInput(aiMock);
		assert.deepEqual(input.franchises, [
			{ gameId: games.hades.id, name: "Roguelites" }
		]);
		const content = JSON.parse(serializedRecap(input)) as {
			games: { columns: string[]; rows: unknown[][] };
		};
		const franchiseIndex = content.games.columns.indexOf("franchise");
		assert.deepEqual(
			content.games.rows.map(row => row[franchiseIndex]),
			["Roguelites"]
		);
	});
});
