import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { REWIND_PERSONA_CODES } from "../../src/rewind/rewind.constants";
import { type Rewind } from "../../src/rewind/rewind.interface";
import { renderRewindImage } from "../../src/rewind-share/rewind-share.service";
import { hasPngSignature, pngDimensions, samplePng } from "./png.helper";
import {
	buildRewind,
	emptyRewind,
	emptyTotals,
	finishedGame
} from "./rewind.fixture";

const LONG_TITLE = "Ñandú Edición Definitiva ".repeat(10).slice(0, 200);

function stubFetch(
	implementation: (input: unknown, init?: RequestInit) => Promise<Response>
) {
	return mock.method(globalThis, "fetch", implementation as typeof fetch);
}

function rewindWithCovers(...coverUrls: string[]): Rewind {
	return buildRewind({
		finishedGames: coverUrls.map((coverUrl, index) =>
			finishedGame({
				gameId: `cover-${index}`,
				title: `Game ${index}`,
				coverUrl
			})
		)
	});
}

function rewindWithBackdrop(backgroundUrl: string): Rewind {
	const rewind = buildRewind();
	const topRated = rewind.highlights.topRated!;
	rewind.highlights.topRated = { ...topRated, backgroundUrl };
	return rewind;
}

function waitForAbort(_input: unknown, init?: RequestInit): Promise<Response> {
	return new Promise((_resolve, reject) => {
		init?.signal?.addEventListener("abort", () =>
			reject(init.signal?.reason)
		);
	});
}

async function assertRendersBothFormats(rewind: Rewind) {
	const story = await renderRewindImage(rewind, "story");
	const og = await renderRewindImage(rewind, "og");

	assert.ok(hasPngSignature(story.png));
	assert.deepEqual(pngDimensions(story.png), { width: 1080, height: 1920 });
	assert.ok(hasPngSignature(og.png));
	assert.deepEqual(pngDimensions(og.png), { width: 1200, height: 630 });
}

void describe("renderRewindImage", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("renders a story PNG of exactly 1080x1920 and an og PNG of 1200x630", async () => {
		await assertRendersBothFormats(buildRewind());
	});

	void it("does not throw with 200-character titles, emoji and accented usernames", async () => {
		const longGame = finishedGame({ gameId: "long", title: LONG_TITLE });
		const rewind = buildRewind({
			user: {
				username: "josé_ñuñoa_🎮",
				name: "José 🔥",
				avatarUrl: null,
				role: "user"
			},
			finishedGames: [
				longGame,
				finishedGame({ gameId: "emoji", title: "🔥🎮👾 Pokémon 🇨🇱" })
			],
			highlights: {
				...buildRewind().highlights,
				topRated: { ...longGame, userRating: 4.5 },
				favoriteGenre: { code: "long", name: LONG_TITLE, count: 1 }
			}
		});

		await assertRendersBothFormats(rewind);
	});

	void it("renders a year with zero finished games and no highlights", async () => {
		await assertRendersBothFormats(emptyRewind());
	});

	void it("renders a year where every total is zero", async () => {
		await assertRendersBothFormats(
			buildRewind({
				totals: emptyTotals({ platinums: 0 }),
				finishedGames: []
			})
		);
	});

	void it("embeds downloaded covers without flagging them as missing", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);

		const image = await renderRewindImage(
			rewindWithCovers(
				"https://covers.test/a.png",
				"https://covers.test/b.png"
			),
			"og"
		);

		assert.ok(hasPngSignature(image.png));
		assert.equal(image.hasMissingImages, false);
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("falls back to gradient covers when the download fails, answers 404 or returns garbage", async () => {
		const responses = [
			() => Promise.reject(new Error("network down")),
			() => Promise.resolve(new Response("not found", { status: 404 })),
			() => Promise.resolve(new Response("<html>not an image</html>"))
		];
		let call = 0;
		stubFetch(() => responses[call++ % responses.length]!());

		const image = await renderRewindImage(
			rewindWithCovers(
				"https://covers.test/a",
				"https://covers.test/b",
				"https://covers.test/c"
			),
			"story"
		);

		assert.deepEqual(pngDimensions(image.png), {
			width: 1080,
			height: 1920
		});
		assert.equal(image.hasMissingImages, true);
	});

	void it("gives up on a cover that takes longer than 3 seconds", async () => {
		stubFetch(waitForAbort);
		const started = Date.now();

		const image = await renderRewindImage(
			rewindWithCovers("https://covers.test/slow.png"),
			"og"
		);

		const elapsed = Date.now() - started;
		assert.ok(elapsed >= 2900 && elapsed < 6000, `took ${elapsed} ms`);
		assert.equal(image.hasMissingImages, true);
	});

	void it("never fetches covers with a non-http URL", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);

		const image = await renderRewindImage(
			rewindWithCovers(
				"javascript:alert(1)",
				"file:///etc/passwd",
				"not a url"
			),
			"og"
		);

		assert.equal(fetchMock.mock.callCount(), 0);
		assert.ok(hasPngSignature(image.png));
	});

	void it("asks RAWG for a resized cover instead of the full image", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);

		await renderRewindImage(
			rewindWithCovers("https://media.rawg.io/media/games/abc/cover.jpg"),
			"og"
		);

		assert.equal(
			fetchMock.mock.calls[0]?.arguments[0],
			"https://media.rawg.io/media/resize/420/-/games/abc/cover.jpg"
		);
	});

	void it("renders both formats for every persona", async () => {
		for (const persona of REWIND_PERSONA_CODES) {
			await assertRendersBothFormats(buildRewind({ persona }));
		}
	});

	void it("renders without background art and never asks for one", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);

		const image = await renderRewindImage(buildRewind(), "story");

		assert.equal(fetchMock.mock.callCount(), 0);
		assert.equal(image.hasMissingImages, false);
		assert.deepEqual(pngDimensions(image.png), {
			width: 1080,
			height: 1920
		});
	});

	void it("fetches the top rated background art at backdrop width", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);
		const rewind = rewindWithBackdrop(
			"https://media.rawg.io/media/games/top/art.jpg"
		);

		const image = await renderRewindImage(rewind, "og");

		assert.equal(image.hasMissingImages, false);
		assert.deepEqual(
			fetchMock.mock.calls.map(call => call.arguments[0]),
			["https://media.rawg.io/media/resize/640/-/games/top/art.jpg"]
		);
	});

	void it("still renders when the background art fails and flags it as missing", async () => {
		stubFetch(() => Promise.reject(new Error("network down")));

		for (const format of ["story", "og"] as const) {
			const image = await renderRewindImage(
				rewindWithBackdrop("https://art.test/broken.jpg"),
				format
			);
			assert.ok(hasPngSignature(image.png));
			assert.equal(image.hasMissingImages, true);
		}
	});

	void it("ignores background art with a non-http URL", async () => {
		const fetchMock = stubFetch(() =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);

		const image = await renderRewindImage(
			rewindWithBackdrop("javascript:alert(1)"),
			"story"
		);

		assert.equal(fetchMock.mock.callCount(), 0);
		assert.ok(hasPngSignature(image.png));
	});
});
