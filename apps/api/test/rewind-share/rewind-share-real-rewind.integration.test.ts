import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { Rewind } from "../../src/rewind/rewind.model";
import { clearRewindImageCache } from "../../src/rewind-share/rewind-share.service";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { bearer, login } from "../helpers/auth.helper";
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
let spanishOwner: User;
let pendingOwner: User;

function storeGeneratedRewind(owner: User, language: "en" | "es" = "en") {
	return Rewind.create({
		userId: owner.id,
		year: 2025,
		language,
		generatedAt: new Date("2025-12-02T10:00:00.000Z")
	});
}

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
		spanishOwner = await createUser();
		pendingOwner = await createUser();
		await privateOwner.update({ rewindVisibility: "private" });
		const owners = [publicOwner, privateOwner, spanishOwner, pendingOwner];
		await Promise.all(owners.map(registerBefore2025));
		await Promise.all(owners.map(finishGameIn2025));
		await Promise.all([
			storeGeneratedRewind(publicOwner),
			storeGeneratedRewind(privateOwner),
			storeGeneratedRewind(spanishOwner, "es")
		]);
	});

	void it("renders the story of a public Rewind for a guest", async () => {
		const response = await api()
			.get(`/share/rewind/${publicOwner.username}/2025/story.png`)
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
			.get(`/share/rewind/${publicOwner.username}/2024/og.png`)
			.expect(404);

		assert.equal(response.body.type, "REWIND_NOT_FOUND");
	});

	void it("answers 403 USER_PRIVATE for a private Rewind image", async () => {
		const response = await api()
			.get(`/share/rewind/${privateOwner.username}/2025/og.png`)
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
			new RegExp(`/share/rewind/${publicOwner.username}/2025/og\\.png`)
		);
		assert.match(response.text, /1 game finished/);
	});

	void it("answers 404 to every share endpoint of a year that is not generated", async () => {
		for (const path of ["story.png", "og.png"]) {
			const response = await api().get(
				`/share/rewind/${pendingOwner.username}/2025/${path}`
			);
			assert.equal(response.status, 404, path);
			assert.equal(response.body.type, "REWIND_NOT_FOUND");
		}

		const page = await api()
			.get(`/share/rewind/${pendingOwner.username}/2025`)
			.expect(404);
		assert.match(page.text, /<title>Completr Rewind<\/title>/);
		assert.doesNotMatch(page.text, /og:image/);
	});

	void it("answers 404 REWIND_NOT_GENERATED to the owner of an ungenerated year", async () => {
		const session = await login(pendingOwner.email);

		const response = await api()
			.get(`/share/rewind/${pendingOwner.username}/2025/og.png`)
			.set("Authorization", bearer(session.accessToken))
			.expect(404);

		assert.equal(response.body.type, "REWIND_NOT_GENERATED");
	});

	void it("writes the preview page in the language of the Rewind", async () => {
		const response = await api()
			.get(`/share/rewind/${spanishOwner.username}/2025`)
			.expect(200);

		assert.match(response.text, /<html lang="es">/);
		assert.match(
			response.text,
			new RegExp(`Rewind 2025 de @${spanishOwner.username}`)
		);
		assert.match(response.text, /1 juego terminado y 1 empezado\./);
		assert.match(response.text, /Continuar a Completr/);
	});

	void it("renders a different image for the Spanish Rewind", async () => {
		clearRewindImageCache();
		const [english, spanish] = await Promise.all([
			api()
				.get(`/share/rewind/${publicOwner.username}/2025/og.png`)
				.buffer(true)
				.expect(200),
			api()
				.get(`/share/rewind/${spanishOwner.username}/2025/og.png`)
				.buffer(true)
				.expect(200)
		]);

		assert.ok(hasPngSignature(spanish.body as Buffer));
		assert.equal(
			(english.body as Buffer).equals(spanish.body as Buffer),
			false
		);
	});
});
