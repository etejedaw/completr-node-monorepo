import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";
import { hasPngSignature, pngDimensions } from "./png.helper";

useTestDatabase();

let publicOwner: User;
let privateOwner: User;

async function registerBefore2025(owner: User) {
	await User.update(
		{ createdAt: new Date("2024-01-01") },
		{ where: { id: owner.id }, silent: true }
	);
}

async function finishGameIn2025(owner: User) {
	const [game, platform] = await Promise.all([
		createGame({ title: "Celeste" }),
		createPlatform()
	]);
	await Backlog.create({
		userId: owner.id,
		gameId: game.id,
		platformId: platform.id,
		status: "completed",
		startedAt: "2025-02-01",
		finishedAt: "2025-03-04",
		realDuration: 8,
		userRating: 5
	});
}

void describe("Rewind share endpoints with the real Rewind", () => {
	before(async () => {
		publicOwner = await createUser();
		privateOwner = await createUser();
		await privateOwner.update({ rewindVisibility: "private" });
		await Promise.all([
			registerBefore2025(publicOwner),
			registerBefore2025(privateOwner)
		]);
		await Promise.all([
			finishGameIn2025(publicOwner),
			finishGameIn2025(privateOwner)
		]);
	});

	void it("renders the story of a public Rewind for a guest", async () => {
		const response = await api()
			.get(`/users/${publicOwner.username}/rewinds/2025/story.png`)
			.buffer(true)
			.expect(200);

		assert.equal(response.headers["content-type"], "image/png");
		assert.ok(hasPngSignature(response.body as Buffer));
		assert.deepEqual(pngDimensions(response.body as Buffer), {
			width: 1080,
			height: 1920
		});
	});

	void it("answers 404 REWIND_NOT_FOUND for a year without games", async () => {
		const response = await api()
			.get(`/users/${publicOwner.username}/rewinds/2024/og.png`)
			.expect(404);

		assert.equal(response.body.type, "REWIND_NOT_FOUND");
	});

	void it("answers 403 USER_PRIVATE for a private Rewind image", async () => {
		const response = await api()
			.get(`/users/${privateOwner.username}/rewinds/2025/og.png`)
			.expect(403);

		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("serves the generic preview page for a private Rewind", async () => {
		const response = await api()
			.get(`/share/rewind/${privateOwner.username}/2025`)
			.expect(200);

		assert.match(response.text, /Completr Rewind/);
		assert.doesNotMatch(response.text, /og:image/);
		assert.doesNotMatch(response.text, /Celeste/);
	});

	void it("serves the preview page with the image for a public Rewind", async () => {
		const response = await api()
			.get(`/share/rewind/${publicOwner.username}/2025`)
			.expect(200);

		assert.match(
			response.text,
			new RegExp(`/users/${publicOwner.username}/rewinds/2025/og\\.png`)
		);
		assert.match(response.text, /1 game finished/);
	});
});
