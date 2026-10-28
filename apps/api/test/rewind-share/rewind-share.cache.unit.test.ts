import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import {
	clearRewindImageCache,
	getRewindImage,
	rewindImageCacheSize
} from "../../src/rewind-share/rewind-share.service";
import { LruCache } from "../../src/rewind-share/utils/lru-cache.util";
import { pngDimensions, samplePng } from "./png.helper";
import { buildRewind, finishedGame } from "./rewind.fixture";

function stubCoverFetch(response: () => Promise<Response>) {
	return mock.method(globalThis, "fetch", response as typeof fetch);
}

function coverResponse() {
	return Promise.resolve(new Response(new Uint8Array(samplePng())));
}

function rewindWithCover(coverUrl: string) {
	return buildRewind({
		finishedGames: [finishedGame({ gameId: "covered", coverUrl })]
	});
}

void describe("LruCache", () => {
	void it("evicts the least recently used entry when it goes over capacity", () => {
		const cache = new LruCache<number>(2);
		cache.set("a", 1);
		cache.set("b", 2);
		cache.get("a");
		cache.set("c", 3);

		assert.equal(cache.get("a"), 1);
		assert.equal(cache.get("b"), undefined);
		assert.equal(cache.get("c"), 3);
		assert.equal(cache.size, 2);
	});

	void it("replaces the value of an existing key without growing", () => {
		const cache = new LruCache<number>(2);
		cache.set("a", 1);
		cache.set("a", 2);

		assert.equal(cache.get("a"), 2);
		assert.equal(cache.size, 1);
	});
});

void describe("getRewindImage", () => {
	beforeEach(() => {
		clearRewindImageCache();
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("renders once and serves the same PNG to repeated requests", async () => {
		const fetchMock = stubCoverFetch(coverResponse);
		const rewind = rewindWithCover("https://covers.test/a.png");

		const first = await getRewindImage(rewind, "og");
		const second = await getRewindImage(structuredClone(rewind), "og");

		assert.equal(first, second);
		assert.equal(fetchMock.mock.callCount(), 1);
		assert.equal(rewindImageCacheSize(), 1);
	});

	void it("shares one render between simultaneous double clicks", async () => {
		const fetchMock = stubCoverFetch(coverResponse);
		const rewind = rewindWithCover("https://covers.test/a.png");

		const [first, second, third] = await Promise.all([
			getRewindImage(rewind, "story"),
			getRewindImage(rewind, "story"),
			getRewindImage(rewind, "story")
		]);

		assert.equal(first, second);
		assert.equal(second, third);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("keeps a separate entry per format and per Rewind content", async () => {
		stubCoverFetch(coverResponse);
		const rewind = rewindWithCover("https://covers.test/a.png");
		const updated = {
			...rewind,
			totals: { ...rewind.totals, finished: 19 }
		};

		const story = await getRewindImage(rewind, "story");
		const og = await getRewindImage(rewind, "og");
		await getRewindImage(updated, "og");

		assert.deepEqual(pngDimensions(story), { width: 1080, height: 1920 });
		assert.deepEqual(pngDimensions(og), { width: 1200, height: 630 });
		assert.equal(rewindImageCacheSize(), 3);
	});

	void it("does not cache an image whose covers failed to download", async () => {
		const fetchMock = stubCoverFetch(() =>
			Promise.reject(new Error("network down"))
		);
		const rewind = rewindWithCover("https://covers.test/broken.png");

		await getRewindImage(rewind, "og");
		await getRewindImage(rewind, "og");

		assert.equal(rewindImageCacheSize(), 0);
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("never holds more than 100 images", async () => {
		const base = buildRewind({ finishedGames: [] });
		for (let year = 2000; year < 2105; year++) {
			await getRewindImage({ ...base, year }, "og");
		}

		assert.equal(rewindImageCacheSize(), 100);
	});
});
