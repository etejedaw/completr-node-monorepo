import "../rewind/rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { Rewind } from "../../src/rewind/rewind.model";
import { freezeClosedRewindEditions } from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import {
	clearRewindImageCache,
	rewindImageCacheSize
} from "../../src/rewind-share/rewind-share.service";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import { closeEdition } from "../rewind/rewind-freeze.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	regenerationOf,
	signUpOn
} from "../rewind/rewind-generation.helper";
import { hasPngSignature, pngDimensions } from "./png.helper";

let platform: Platform;
let games: Record<"hades" | "celeste", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" })
	};
});

beforeEach(async () => {
	clearRewindImageCache();
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await openRewindEdition2026();
});

afterEach(() => {
	mock.restoreAll();
});

async function frozenPlayer(role: Account["user"]["role"] = "user") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, games.hades, platform, { finishedAt: "2026-03-10" });
	await generate(player, 2026).expect(201);
	await closeEdition(2026);
	await freezeClosedRewindEditions();
	return player;
}

function storyOf(player: Account) {
	return api()
		.get(`/share/rewind/${player.user.username}/2026/story.png`)
		.buffer(true);
}

function sharePageOf(player: Account) {
	return api().get(`/share/rewind/${player.user.username}/2026`);
}

void describe("share images of a frozen Rewind", () => {
	void it("draws the image and the preview page from the snapshot, so later runs do not change them", async () => {
		const player = await frozenPlayer();

		const story = await storyOf(player).expect(200);
		const page = await sharePageOf(player).expect(200);
		const cachedImages = rewindImageCacheSize();
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-06-06"
		});
		await Backlog.update(
			{ isPublic: false },
			{ where: { userId: player.user.id, gameId: games.hades.id } }
		);
		const storyAfterRuns = await storyOf(player).expect(200);
		const pageAfterRuns = await sharePageOf(player).expect(200);

		assert.ok(hasPngSignature(story.body as Buffer));
		assert.deepEqual(pngDimensions(story.body as Buffer), {
			width: 1080,
			height: 1920
		});
		assert.equal(cachedImages, 1);
		assert.equal(rewindImageCacheSize(), 1);
		assert.ok(
			Buffer.compare(
				story.body as Buffer,
				storyAfterRuns.body as Buffer
			) === 0
		);
		assert.equal(pageAfterRuns.text, page.text);
	});

	void it("renders a new image when the Rewind is frozen and again when it is regenerated", async () => {
		mockPremiumStats();
		mockAiRecap();
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10"
		});
		await generate(player, 2026).expect(201);

		await storyOf(player).expect(200);
		await closeEdition(2026);
		await freezeClosedRewindEditions();
		await storyOf(player).expect(200);
		const afterFreezing = rewindImageCacheSize();
		await createRewindEdition(2027, {
			opensAt: "2026-12-15",
			closesAt: "2026-12-31",
			graceStartsAt: "2026-12-15",
			graceEndsAt: "2026-12-15",
			premiumRegenerations: 1
		});
		const frozen = await findRewindRow(player, 2026);
		await generate(
			player,
			2026,
			regenerationOf(frozen!.generatedAt.toISOString())
		).expect(200);
		await storyOf(player).expect(200);

		assert.equal(afterFreezing, 2);
		assert.equal(rewindImageCacheSize(), 3);
	});

	void it("falls back to the latest templates for a snapshot with an unknown design", async () => {
		const player = await frozenPlayer();
		const row = await findRewindRow(player, 2026);
		await row!.update({ snapshot: { ...row!.snapshot!, design: "1999" } });

		const [story, og] = await Promise.all([
			storyOf(player),
			api()
				.get(`/share/rewind/${player.user.username}/2026/og.png`)
				.buffer(true)
		]);

		assert.equal(story.status, 200);
		assert.equal(og.status, 200);
		assert.deepEqual(pngDimensions(og.body as Buffer), {
			width: 1200,
			height: 630
		});
	});

	void it("answers 404 to a visitor when the year had no public runs at closing", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10",
			isPublic: false
		});
		await generate(player, 2026).expect(201);
		await closeEdition(2026);
		await freezeClosedRewindEditions();

		const story = await storyOf(player);
		const page = await sharePageOf(player);
		const ownStory = await storyOf(player)
			.set("Authorization", player.authorization)
			.expect(200);

		assert.equal(story.status, 404);
		assert.equal(page.status, 404);
		assert.ok(hasPngSignature(ownStory.body as Buffer));
	});
});
