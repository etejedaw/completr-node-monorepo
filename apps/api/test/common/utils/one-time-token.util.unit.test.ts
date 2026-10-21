import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../../../src/common/utils/one-time-token.util";

void describe("generateOneTimeToken", () => {
	void it("generates a 64 character hex raw token", () => {
		const { rawToken } = generateOneTimeToken();

		assert.match(rawToken, /^[a-f0-9]{64}$/);
	});

	void it("returns the SHA-256 hash of the raw token", () => {
		const { rawToken, tokenHash } = generateOneTimeToken();

		assert.equal(tokenHash, hashOneTimeToken(rawToken));
		assert.notEqual(tokenHash, rawToken);
	});

	void it("generates a different token on every call", () => {
		assert.notEqual(
			generateOneTimeToken().rawToken,
			generateOneTimeToken().rawToken
		);
	});
});

void describe("hashOneTimeToken", () => {
	void it("matches the known SHA-256 digest of its input", () => {
		assert.equal(
			hashOneTimeToken("abc"),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
		);
	});
});
