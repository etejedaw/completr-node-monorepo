import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import { IgdbTokenClient } from "../../src/igdb/igdb-token.client";
import { captureRejection } from "../unit-helpers/mocks";
import {
	bodyOf,
	createGate,
	jsonResponse,
	stubIgdbNetwork,
	tokenResponse,
	tokenSequence
} from "./igdb-fetch.helper";

const CLIENT_ID = "fake-client-id";
const CLIENT_SECRET = "fake-client-secret";
const HOUR_MS = 60 * 60 * 1000;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function assertServiceError(error: unknown, code: string) {
	assert.ok(error instanceof ServiceError);
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, "IGDB Provider");
	return error;
}

function fakeClock(start = 1_700_000_000_000) {
	const clock = { now: start };
	return {
		clock,
		now: () => clock.now
	};
}

afterEach(() => {
	mock.restoreAll();
});

void describe("IgdbTokenClient.getToken", () => {
	void it("asks Twitch for a client_credentials token with a form body", async () => {
		const { tokenCalls } = stubIgdbNetwork({ token: tokenSequence("abc") });
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		assert.equal(await client.getToken(), "abc");

		assert.equal(tokenCalls.length, 1);
		const [call] = tokenCalls;
		assert.ok(call);
		assert.equal(call.init.method, "POST");
		assert.equal(call.url.includes(CLIENT_SECRET), false);
		const form = new URLSearchParams(bodyOf(call));
		assert.equal(form.get("client_id"), CLIENT_ID);
		assert.equal(form.get("client_secret"), CLIENT_SECRET);
		assert.equal(form.get("grant_type"), "client_credentials");
	});

	void it("reuses the cached token while it is valid", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: tokenSequence("first", "second")
		});
		const { clock, now } = fakeClock();
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET, now);

		assert.equal(await client.getToken(), "first");
		clock.now += HOUR_MS - REFRESH_MARGIN_MS - 1;
		assert.equal(await client.getToken(), "first");
		assert.equal(await client.getToken(), "first");

		assert.equal(tokenCalls.length, 1);
	});

	void it("renews the token a margin before expires_in", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: tokenSequence("first", "second")
		});
		const { clock, now } = fakeClock();
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET, now);

		assert.equal(await client.getToken(), "first");
		clock.now += HOUR_MS - REFRESH_MARGIN_MS;

		assert.equal(await client.getToken(), "second");
		assert.equal(tokenCalls.length, 2);
	});

	void it("never caches a token shorter than the margin", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: (_call, index) => tokenResponse(`short-${index}`, 30)
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		assert.equal(await client.getToken(), "short-0");
		assert.equal(await client.getToken(), "short-1");
		assert.equal(tokenCalls.length, 2);
	});

	void it("shares a single in-flight request between concurrent callers", async () => {
		const gate = createGate();
		const { tokenCalls } = stubIgdbNetwork({
			token: async () => {
				await gate.opened;
				return tokenResponse("shared");
			}
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const callers = Array.from({ length: 8 }, () => client.getToken());
		gate.open();

		assert.deepEqual(await Promise.all(callers), Array(8).fill("shared"));
		assert.equal(tokenCalls.length, 1);
	});

	void it("rejects every concurrent caller with the same failure and retries on the next call", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: (_call, index) =>
				index === 0
					? new Response("boom", { status: 503 })
					: tokenResponse("recovered")
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const failures = await Promise.all(
			Array.from({ length: 4 }, () => captureRejection(client.getToken()))
		);

		for (const failure of failures)
			assertServiceError(failure, "IGDB_REQUEST_ERROR");
		assert.equal(tokenCalls.length, 1);
		assert.equal(await client.getToken(), "recovered");
		assert.equal(tokenCalls.length, 2);
	});

	for (const status of [400, 401, 403]) {
		void it(`fails with IGDB_AUTH_ERROR when Twitch rejects the credentials with ${status}`, async () => {
			stubIgdbNetwork({
				token: () =>
					jsonResponse(
						{ status, message: "invalid client secret" },
						status
					)
			});
			const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

			const error = await captureRejection(client.getToken());

			const serviceError = assertServiceError(error, "IGDB_AUTH_ERROR");
			assert.equal(
				String(serviceError.serviceError.raw).includes(CLIENT_SECRET),
				false
			);
		});
	}

	for (const status of [429, 500, 502]) {
		void it(`fails with IGDB_REQUEST_ERROR when Twitch answers ${status}`, async () => {
			stubIgdbNetwork({
				token: () => new Response("upstream", { status })
			});
			const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

			const error = await captureRejection(client.getToken());

			assertServiceError(error, "IGDB_REQUEST_ERROR");
		});
	}

	void it("fails with IGDB_REQUEST_ERROR describing the cause when the network fails", async () => {
		stubIgdbNetwork({
			token: () => {
				throw new TypeError("fetch failed");
			}
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const error = await captureRejection(client.getToken());

		const serviceError = assertServiceError(error, "IGDB_REQUEST_ERROR");
		assert.equal(
			serviceError.serviceError.raw,
			"IGDB token request failed before a response: fetch failed"
		);
	});

	void it("fails with IGDB_PARSE_ERROR when Twitch answers 2xx with something that is not JSON", async () => {
		stubIgdbNetwork({
			token: () => new Response("<html>oops</html>", { status: 200 })
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const error = await captureRejection(client.getToken());

		const serviceError = assertServiceError(error, "IGDB_PARSE_ERROR");
		assert.ok(serviceError.serviceError.raw instanceof SyntaxError);
	});

	const garbageBodies: [string, unknown][] = [
		["null", null],
		["an array", ["token"]],
		["no access_token", { expires_in: 3600 }],
		["an empty access_token", { access_token: "", expires_in: 3600 }],
		["a numeric access_token", { access_token: 12, expires_in: 3600 }],
		["no expires_in", { access_token: "abc" }],
		["a string expires_in", { access_token: "abc", expires_in: "3600" }],
		["a negative expires_in", { access_token: "abc", expires_in: -1 }]
	];

	for (const [description, body] of garbageBodies) {
		void it(`fails with IGDB_PARSE_ERROR when the token body has ${description}`, async () => {
			stubIgdbNetwork({ token: () => jsonResponse(body) });
			const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

			const error = await captureRejection(client.getToken());

			assertServiceError(error, "IGDB_PARSE_ERROR");
		});
	}
});

void describe("IgdbTokenClient.invalidate", () => {
	void it("drops the cached token so the next call asks for a new one", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: tokenSequence("first", "second")
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const first = await client.getToken();
		client.invalidate(first);

		assert.equal(await client.getToken(), "second");
		assert.equal(tokenCalls.length, 2);
	});

	void it("ignores a stale token so a late 401 does not drop a renewed one", async () => {
		const { tokenCalls } = stubIgdbNetwork({
			token: tokenSequence("first", "second")
		});
		const client = new IgdbTokenClient(CLIENT_ID, CLIENT_SECRET);

		const first = await client.getToken();
		client.invalidate(first);
		await client.getToken();
		client.invalidate(first);

		assert.equal(await client.getToken(), "second");
		assert.equal(tokenCalls.length, 2);
	});
});
