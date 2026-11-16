import "../rewind/rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { Rewind } from "../../src/rewind/rewind.model";
import { freezeClosedRewindEditions } from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import {
	clearRewindImageCache,
	rewindImageCacheSize
} from "../../src/rewind-share/rewind-share.service";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import { closeEdition } from "../rewind/rewind-freeze.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	generate,
	openRewindEdition2026,
	signUpOn
} from "../rewind/rewind-generation.helper";
import { hasPngSignature } from "./png.helper";

const IMAGE_PATHS = ["story.png", "story-list.png", "og.png"] as const;

useTestDatabase();

beforeEach(async () => {
	clearRewindImageCache();
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
});

afterEach(() => {
	mock.restoreAll();
});

async function generatedPlayer(design: string) {
	await openRewindEdition2026({ design });
	const [platform, game] = await Promise.all([
		createPlatform(),
		createGame({ title: "Hades" })
	]);
	const player = await signUpOn("2025-01-15T00:00:00.000Z");
	await addRun(player, game, platform, { finishedAt: "2026-03-10" });
	await generate(player, 2026).expect(201);
	return player;
}

async function frozenPlayer(design: string) {
	const player = await generatedPlayer(design);
	await closeEdition(2026);
	await freezeClosedRewindEditions();
	return player;
}

async function freezeDesignOf(player: Account, design: string) {
	const row = await findRewindRow(player, 2026);
	const { snapshot } = row!;
	await row!.update({
		snapshot: {
			...snapshot!,
			design,
			owner: { ...snapshot!.owner, design },
			public: snapshot!.public && { ...snapshot!.public, design }
		}
	});
}

function imageOf(player: Account, path: string) {
	return api()
		.get(`/share/rewind/${player.user.username}/2026/${path}`)
		.buffer(true);
}

function pageOf(player: Account) {
	return api().get(`/share/rewind/${player.user.username}/2026`);
}

async function assertNoImagesFor(player: Account, authorization?: string) {
	for (const path of IMAGE_PATHS) {
		const request = imageOf(player, path);
		const response = await (authorization
			? request.set("Authorization", authorization)
			: request);
		assert.equal(response.status, 404, path);
		assert.equal(response.body.type, "REWIND_NOT_FOUND", path);
	}
}

function assertPageWithoutImage(html: string) {
	assert.match(html, /<meta property="og:title"/);
	assert.match(html, /<meta name="twitter:card" content="summary">/);
	assert.doesNotMatch(html, /og:image/);
	assert.doesNotMatch(html, /twitter:image/);
	assert.doesNotMatch(html, /summary_large_image/);
	assert.doesNotMatch(html, /\.png/);
}

void describe("share images of a Rewind with the 2025 design", () => {
	void it("answers 404 to the three images of a frozen Rewind and never renders or caches anything", async () => {
		const player = await frozenPlayer("2025");

		await assertNoImagesFor(player);

		assert.equal(rewindImageCacheSize(), 0);
	});

	void it("answers 404 to the three images of a live Rewind", async () => {
		const player = await generatedPlayer("2025");

		await assertNoImagesFor(player);

		assert.equal(rewindImageCacheSize(), 0);
	});

	void it("answers 404 to the owner too, since the design has no images for anyone", async () => {
		const player = await frozenPlayer("2025");

		await assertNoImagesFor(player, player.authorization);
	});

	void it("keeps the preview page working, without image meta tags, for a frozen Rewind", async () => {
		const player = await frozenPlayer("2025");

		const page = await pageOf(player).expect(200);

		assertPageWithoutImage(page.text);
		assert.match(page.text, /1 game finished/);
		assert.match(page.text, /http-equiv="refresh"/);
	});

	void it("keeps the preview page working, without image meta tags, for a live Rewind", async () => {
		const player = await generatedPlayer("2025");

		const page = await pageOf(player).expect(200);

		assertPageWithoutImage(page.text);
	});

	void it("answers 404 to a burst of simultaneous requests for every route without rendering", async () => {
		const player = await frozenPlayer("2025");

		const responses = await Promise.all(
			Array.from({ length: 3 }, () =>
				IMAGE_PATHS.map(path => imageOf(player, path))
			).flat()
		);

		assert.deepEqual(
			responses.map(response => response.status),
			Array(9).fill(404)
		);
		assert.equal(rewindImageCacheSize(), 0);
	});

	void it("answers 403 USER_PRIVATE to a visitor when the owner hid the Rewind, before looking at the design", async () => {
		const player = await frozenPlayer("2025");
		await User.update(
			{ rewindVisibility: "private" },
			{ where: { id: player.user.id } }
		);

		for (const path of IMAGE_PATHS) {
			const response = await imageOf(player, path);
			assert.equal(response.status, 403, path);
			assert.equal(response.body.type, "USER_PRIVATE", path);
		}
		const page = await pageOf(player).expect(200);
		assert.match(page.text, /<title>Completr Rewind<\/title>/);
		assert.doesNotMatch(page.text, /og:image/);
	});

	void it("answers 404 REWIND_NOT_GENERATED to the owner of a year that was never generated", async () => {
		await openRewindEdition2026({ design: "2025" });
		const [platform, game] = await Promise.all([
			createPlatform(),
			createGame({ title: "Hades" })
		]);
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, game, platform, { finishedAt: "2026-03-10" });

		const response = await imageOf(player, "og.png")
			.set("Authorization", player.authorization)
			.expect(404);

		assert.equal(response.body.type, "REWIND_NOT_GENERATED");
	});

	void it("answers 404 when a frozen 2026 snapshot is switched to the 2025 design and serves images again when switched back", async () => {
		const player = await frozenPlayer("2026");
		await imageOf(player, "story.png").expect(200);

		await freezeDesignOf(player, "2025");
		await assertNoImagesFor(player);
		await freezeDesignOf(player, "2026");
		const story = await imageOf(player, "story.png").expect(200);

		assert.ok(hasPngSignature(story.body as Buffer));
	});

	void it("keeps the latest templates for a snapshot with an unknown design", async () => {
		const player = await frozenPlayer("2026");
		await freezeDesignOf(player, "../2025");

		for (const path of IMAGE_PATHS) await imageOf(player, path).expect(200);
		const page = await pageOf(player).expect(200);

		assert.match(page.text, /og:image/);
	});
});

void describe("share images of a Rewind with the 2026 design", () => {
	void it("keeps serving the three images and the og:image meta tags for a frozen Rewind", async () => {
		const player = await frozenPlayer("2026");

		for (const path of IMAGE_PATHS) {
			const response = await imageOf(player, path).expect(200);
			assert.ok(hasPngSignature(response.body as Buffer), path);
		}
		const page = await pageOf(player).expect(200);

		assert.match(
			page.text,
			new RegExp(
				`<meta property="og:image" content="[^"]+/share/rewind/${player.user.username}/2026/og\\.png">`
			)
		);
		assert.match(page.text, /twitter:image/);
		assert.match(page.text, /summary_large_image/);
	});

	void it("keeps serving the images of a live Rewind", async () => {
		const player = await generatedPlayer("2026");

		for (const path of IMAGE_PATHS) await imageOf(player, path).expect(200);

		assert.equal(rewindImageCacheSize(), 3);
	});
});
