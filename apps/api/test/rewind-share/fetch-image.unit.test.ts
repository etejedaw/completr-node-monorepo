import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { COVER_MAX_BYTES } from "../../src/rewind-share/rewind-share.constants";
import { fetchImageDataUri } from "../../src/rewind-share/utils/fetch-image.util";
import { samplePng } from "./png.helper";

function stubFetch(
	implementation: (input: unknown, init?: RequestInit) => Promise<Response>
) {
	return mock.method(globalThis, "fetch", implementation as typeof fetch);
}

function chunkedResponse(chunks: Uint8Array[]) {
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			}
		})
	);
}

afterEach(() => {
	mock.restoreAll();
});

void describe("fetchImageDataUri", () => {
	void it("never requests a non-https cover", async () => {
		const fetchMock = stubFetch(() => Promise.resolve(new Response("x")));

		for (const url of [
			"http://example.test/cover.png",
			"file:///etc/passwd",
			"javascript:alert(1)",
			"not a url",
			""
		])
			assert.equal(await fetchImageDataUri(url), null);

		assert.equal(fetchMock.mock.callCount(), 0);
	});

	void it("drops a body that exceeds the limit even without content-length", async () => {
		const oversized = new Uint8Array(COVER_MAX_BYTES + 1);
		stubFetch(() => Promise.resolve(chunkedResponse([oversized])));

		assert.equal(
			await fetchImageDataUri("https://media.example.test/big.png"),
			null
		);
	});

	void it("reads a body delivered in several chunks", async () => {
		const bytes = samplePng();
		const middle = Math.floor(bytes.length / 2);
		stubFetch(() =>
			Promise.resolve(
				chunkedResponse([
					bytes.subarray(0, middle),
					bytes.subarray(middle)
				])
			)
		);

		const dataUri = await fetchImageDataUri(
			"https://media.example.test/ok.png"
		);

		assert.match(dataUri ?? "", /^data:image\/png;base64,/);
	});
});
