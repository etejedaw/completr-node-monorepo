import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	DisabledIgdbProvider,
	IgdbClient,
	IgdbProvider
} from "../../src/igdb/igdb.provider";
import { captureRejection } from "../unit-helpers/mocks";
import {
	BARE_GAME,
	bodyOf,
	createGate,
	ELDEN_RING,
	headersOf,
	jsonResponse,
	type RecordedCall,
	stubIgdbNetwork,
	tokenSequence
} from "./igdb-fetch.helper";

const CLIENT_ID = "fake-client-id";
const CLIENT_SECRET = "fake-client-secret";
const GAME_FIELDS =
	"fields id,name,slug,summary,first_release_date,rating,rating_count,url,game_type.id,game_type.type,cover.id,cover.image_id,platforms.id,platforms.slug,genres.id,genres.slug,themes.id,themes.slug;";

function assertServiceError(error: unknown, code: string) {
	assert.ok(error instanceof ServiceError);
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, "IGDB Provider");
	return error;
}

function onlyCall(calls: RecordedCall[]) {
	assert.equal(calls.length, 1);
	const [call] = calls;
	assert.ok(call);
	return call;
}

function bearerOf(call: RecordedCall | undefined) {
	assert.ok(call);
	return headersOf(call).get("Authorization");
}

function newProvider() {
	return new IgdbProvider(CLIENT_ID, CLIENT_SECRET);
}

afterEach(() => {
	mock.restoreAll();
});

void describe("IgdbClient.create", () => {
	const disabledCases: [string, string | undefined, string | undefined][] = [
		["no credentials", undefined, undefined],
		["no client id", undefined, CLIENT_SECRET],
		["no client secret", CLIENT_ID, undefined],
		["an empty client id", "", CLIENT_SECRET],
		["an empty client secret", CLIENT_ID, ""]
	];

	for (const [description, clientId, clientSecret] of disabledCases) {
		void it(`returns a DisabledIgdbProvider with ${description}`, () => {
			const client = IgdbClient.create(clientId, clientSecret);

			assert.ok(client instanceof DisabledIgdbProvider);
			assert.equal(client.isEnabled, false);
		});
	}

	void it("returns an IgdbProvider when both credentials are present", () => {
		const client = IgdbClient.create(CLIENT_ID, CLIENT_SECRET);

		assert.ok(client instanceof IgdbProvider);
		assert.equal(client.isEnabled, true);
	});

	void it("does not ask for a token until the first request", () => {
		const { tokenCalls } = stubIgdbNetwork({});

		IgdbClient.create(CLIENT_ID, CLIENT_SECRET);

		assert.equal(tokenCalls.length, 0);
	});
});

void describe("DisabledIgdbProvider", () => {
	const provider = new DisabledIgdbProvider();

	const methods: [string, () => Promise<unknown>][] = [
		["searchGame", () => provider.searchGame()],
		["getGameById", () => provider.getGameById()],
		["getGameBySlug", () => provider.getGameBySlug()]
	];

	for (const [name, call] of methods) {
		void it(`${name} returns a promise rejected with IGDB_DISABLED`, async () => {
			let promise: Promise<unknown> | undefined;
			assert.doesNotThrow(() => {
				promise = call();
			});
			assert.ok(promise instanceof Promise);

			const error = await captureRejection(promise);

			assertServiceError(error, "IGDB_DISABLED");
		});
	}

	void it("never calls fetch, neither Twitch nor IGDB", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({});

		await Promise.all(methods.map(([, call]) => captureRejection(call())));

		assert.equal(tokenCalls.length, 0);
		assert.equal(igdbCalls.length, 0);
	});
});

void describe("IgdbProvider request shape", () => {
	void it("posts to the games endpoint with Client-ID, the bearer token and Accept JSON", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("token-1"),
			igdb: () => jsonResponse([ELDEN_RING])
		});

		await newProvider().searchGame("elden ring");

		const call = onlyCall(igdbCalls);
		assert.equal(call.init.method, "POST");
		const headers = headersOf(call);
		assert.equal(headers.get("Client-ID"), CLIENT_ID);
		assert.equal(headers.get("Authorization"), "Bearer token-1");
		assert.equal(headers.get("Accept"), "application/json");
		assert.equal(
			JSON.stringify([...headers]).includes(CLIENT_SECRET),
			false
		);
	});

	void it("reuses the token between calls", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("token-1", "token-2"),
			igdb: () => jsonResponse([ELDEN_RING])
		});
		const provider = newProvider();

		await provider.searchGame("elden ring");
		await provider.getGameById(ELDEN_RING.id);
		await provider.getGameBySlug(ELDEN_RING.slug);

		assert.equal(tokenCalls.length, 1);
		assert.equal(igdbCalls.length, 3);
		for (const call of igdbCalls)
			assert.equal(bearerOf(call), "Bearer token-1");
	});

	void it("concurrent calls on a cold provider ask for a single token", async () => {
		const gate = createGate();
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: async () => {
				await gate.opened;
				return tokenSequence("token-1")({ url: "", init: {} }, 0);
			},
			igdb: () => jsonResponse([ELDEN_RING])
		});
		const provider = newProvider();

		const pending = [
			provider.searchGame("a"),
			provider.searchGame("b"),
			provider.getGameById(1),
			provider.getGameBySlug("c"),
			provider.searchGame("d", { mainGamesOnly: true })
		];
		gate.open();
		await Promise.all(pending);

		assert.equal(tokenCalls.length, 1);
		assert.equal(igdbCalls.length, 5);
	});
});

void describe("IgdbProvider.searchGame", () => {
	void it("sends the Apicalypse search with every field and the default limit", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			igdb: () => jsonResponse([ELDEN_RING])
		});

		await newProvider().searchGame("elden ring");

		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`search "elden ring"; ${GAME_FIELDS} limit 10;`
		);
	});

	void it("escapes quotes and backslashes so the text cannot leave the literal", async () => {
		const { igdbCalls } = stubIgdbNetwork({});

		await newProvider().searchGame('ab"; where id = 1; \\" c\\');

		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`search "ab\\"; where id = 1; \\\\\\" c\\\\"; ${GAME_FIELDS} limit 10;`
		);
	});

	void it("keeps unicode and symbols of the query untouched", async () => {
		const { igdbCalls } = stubIgdbNetwork({});

		await newProvider().searchGame("pokémon & friends/100% ;");

		assert.match(
			bodyOf(onlyCall(igdbCalls)),
			/^search "pokémon & friends\/100% ;";/
		);
	});

	void it("filters by the main game type when mainGamesOnly is set", async () => {
		const { igdbCalls } = stubIgdbNetwork({});

		await newProvider().searchGame("elden ring", {
			mainGamesOnly: true,
			limit: 3
		});

		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`search "elden ring"; ${GAME_FIELDS} where game_type = 0; limit 3;`
		);
	});

	void it("does not filter by game type when mainGamesOnly is false", async () => {
		const { igdbCalls } = stubIgdbNetwork({});

		await newProvider().searchGame("elden ring", { mainGamesOnly: false });

		assert.equal(bodyOf(onlyCall(igdbCalls)).includes("where"), false);
	});

	const garbageLimits = [0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY];

	for (const limit of garbageLimits) {
		void it(`falls back to the default limit when limit is ${limit}`, async () => {
			const { igdbCalls } = stubIgdbNetwork({});

			await newProvider().searchGame("x", { limit });

			assert.match(bodyOf(onlyCall(igdbCalls)), / limit 10;$/);
		});
	}

	void it("caps the limit at the IGDB maximum", async () => {
		const { igdbCalls } = stubIgdbNetwork({});

		await newProvider().searchGame("x", { limit: 10_000 });

		assert.match(bodyOf(onlyCall(igdbCalls)), / limit 500;$/);
	});

	for (const query of ["", "   ", "\n\t"]) {
		void it(`returns an empty list without calling the network for ${JSON.stringify(query)}`, async () => {
			const { tokenCalls, igdbCalls } = stubIgdbNetwork({});

			assert.deepEqual(await newProvider().searchGame(query), []);
			assert.equal(tokenCalls.length, 0);
			assert.equal(igdbCalls.length, 0);
		});
	}

	void it("returns the games as IGDB sends them, also with missing fields", async () => {
		stubIgdbNetwork({ igdb: () => jsonResponse([ELDEN_RING, BARE_GAME]) });

		const games = await newProvider().searchGame("elden ring");

		assert.deepEqual(games, [ELDEN_RING, BARE_GAME]);
		assert.equal(games[1]?.cover, undefined);
	});

	void it("returns an empty list when IGDB finds nothing", async () => {
		stubIgdbNetwork({ igdb: () => jsonResponse([]) });

		assert.deepEqual(await newProvider().searchGame("zzzz"), []);
	});

	void it("each concurrent search gets its own result even if IGDB answers out of order", async () => {
		const gates = [createGate(), createGate(), createGate()];
		const games = [ELDEN_RING, BARE_GAME, { ...BARE_GAME, id: 7 }];
		stubIgdbNetwork({
			igdb: async (_call, index) => {
				await gates[index]?.opened;
				return jsonResponse([games[index]]);
			}
		});
		const provider = newProvider();

		const pending = [0, 1, 2].map(index =>
			provider.searchGame(`query-${index}`)
		);
		for (const gate of [...gates].reverse()) gate.open();
		const results = await Promise.all(pending);

		assert.deepEqual(
			results.map(([game]) => game?.id),
			[ELDEN_RING.id, BARE_GAME.id, 7]
		);
	});

	void it("recovers on the next call after an intermittent failure", async () => {
		stubIgdbNetwork({
			igdb: (_call, index) =>
				index % 2 === 0
					? new Response("flaky", { status: 503 })
					: jsonResponse([ELDEN_RING])
		});
		const provider = newProvider();

		assertServiceError(
			await captureRejection(provider.searchGame("x")),
			"IGDB_REQUEST_ERROR"
		);
		assert.deepEqual(await provider.searchGame("x"), [ELDEN_RING]);
		assertServiceError(
			await captureRejection(provider.searchGame("x")),
			"IGDB_REQUEST_ERROR"
		);
	});
});

void describe("IgdbProvider.getGameById", () => {
	void it("queries the game by id with every field", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			igdb: () => jsonResponse([ELDEN_RING])
		});

		const game = await newProvider().getGameById(ELDEN_RING.id);

		assert.deepEqual(game, ELDEN_RING);
		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`${GAME_FIELDS} where id = 119133; limit 1;`
		);
	});

	void it("fails with IGDB_NOT_FOUND when IGDB answers an empty array", async () => {
		stubIgdbNetwork({ igdb: () => jsonResponse([]) });

		const error = await captureRejection(newProvider().getGameById(1));

		assertServiceError(error, "IGDB_NOT_FOUND");
	});

	for (const id of [0, -1, 1.5, Number.NaN, Number.MAX_VALUE]) {
		void it(`fails with IGDB_NOT_FOUND without calling the network for id ${id}`, async () => {
			const { tokenCalls, igdbCalls } = stubIgdbNetwork({});

			const error = await captureRejection(newProvider().getGameById(id));

			assertServiceError(error, "IGDB_NOT_FOUND");
			assert.equal(tokenCalls.length, 0);
			assert.equal(igdbCalls.length, 0);
		});
	}
});

void describe("IgdbProvider.getGameBySlug", () => {
	void it("queries the game by slug with every field", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			igdb: () => jsonResponse([ELDEN_RING])
		});

		const game = await newProvider().getGameBySlug("elden-ring");

		assert.deepEqual(game, ELDEN_RING);
		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`${GAME_FIELDS} where slug = "elden-ring"; limit 1;`
		);
	});

	void it("escapes quotes and backslashes of the slug", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			igdb: () => jsonResponse([ELDEN_RING])
		});

		await newProvider().getGameBySlug('x" | id = 1; \\');

		assert.equal(
			bodyOf(onlyCall(igdbCalls)),
			`${GAME_FIELDS} where slug = "x\\" | id = 1; \\\\"; limit 1;`
		);
	});

	void it("fails with IGDB_NOT_FOUND when IGDB answers an empty array", async () => {
		stubIgdbNetwork({ igdb: () => jsonResponse([]) });

		const error = await captureRejection(
			newProvider().getGameBySlug("missing")
		);

		assertServiceError(error, "IGDB_NOT_FOUND");
	});

	void it("fails with IGDB_NOT_FOUND without calling the network for a blank slug", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({});

		const error = await captureRejection(newProvider().getGameBySlug("  "));

		assertServiceError(error, "IGDB_NOT_FOUND");
		assert.equal(tokenCalls.length + igdbCalls.length, 0);
	});
});

void describe("IgdbProvider token renewal on 401", () => {
	void it("invalidates the token, asks for a new one and retries once", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("expired", "fresh"),
			igdb: (_call, index) =>
				index === 0
					? new Response("unauthorized", { status: 401 })
					: jsonResponse([ELDEN_RING])
		});

		const game = await newProvider().getGameById(ELDEN_RING.id);

		assert.deepEqual(game, ELDEN_RING);
		assert.equal(tokenCalls.length, 2);
		assert.equal(igdbCalls.length, 2);
		const [firstCall, retriedCall] = igdbCalls;
		assert.ok(firstCall && retriedCall);
		assert.equal(bearerOf(firstCall), "Bearer expired");
		assert.equal(bearerOf(retriedCall), "Bearer fresh");
		assert.equal(bodyOf(firstCall), bodyOf(retriedCall));
	});

	void it("keeps using the renewed token afterwards", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("expired", "fresh"),
			igdb: (_call, index) =>
				index === 0
					? new Response("unauthorized", { status: 401 })
					: jsonResponse([ELDEN_RING])
		});
		const provider = newProvider();

		await provider.searchGame("x");
		await provider.searchGame("y");

		assert.equal(tokenCalls.length, 2);
		assert.equal(bearerOf(igdbCalls[2]), "Bearer fresh");
	});

	void it("fails with IGDB_AUTH_ERROR on a second 401 without retrying again", async () => {
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("first", "second", "third"),
			igdb: () => new Response("unauthorized", { status: 401 })
		});

		const error = await captureRejection(newProvider().searchGame("x"));

		assertServiceError(error, "IGDB_AUTH_ERROR");
		assert.equal(tokenCalls.length, 2);
		assert.equal(igdbCalls.length, 2);
	});

	void it("fails with IGDB_AUTH_ERROR when Twitch rejects the renewal", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			token: (_call, index) =>
				index === 0
					? tokenSequence("revoked")(_call, 0)
					: jsonResponse({ message: "invalid client secret" }, 403),
			igdb: () => new Response("unauthorized", { status: 401 })
		});

		const error = await captureRejection(newProvider().searchGame("x"));

		assertServiceError(error, "IGDB_AUTH_ERROR");
		assert.equal(igdbCalls.length, 1);
	});

	void it("concurrent 401s share a single renewal", async () => {
		const gate = createGate();
		const { tokenCalls, igdbCalls } = stubIgdbNetwork({
			token: tokenSequence("expired", "fresh"),
			igdb: async call => {
				if (headersOf(call).get("Authorization") === "Bearer fresh")
					return jsonResponse([ELDEN_RING]);
				await gate.opened;
				return new Response("unauthorized", { status: 401 });
			}
		});
		const provider = newProvider();

		const pending = Array.from({ length: 4 }, (_, index) =>
			provider.searchGame(`q-${index}`)
		);
		gate.open();
		const results = await Promise.all(pending);

		assert.ok(results.every(games => games[0]?.id === ELDEN_RING.id));
		assert.equal(tokenCalls.length, 2);
		assert.equal(
			igdbCalls.filter(call => bearerOf(call) === "Bearer fresh").length,
			4
		);
	});

	void it("fails with IGDB_AUTH_ERROR on the first request when Twitch rejects the credentials", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			token: () => jsonResponse({ message: "invalid client" }, 400)
		});

		const error = await captureRejection(newProvider().searchGame("x"));

		assertServiceError(error, "IGDB_AUTH_ERROR");
		assert.equal(igdbCalls.length, 0);
	});

	void it("fails with IGDB_REQUEST_ERROR when the token request hits a network failure", async () => {
		const { igdbCalls } = stubIgdbNetwork({
			token: () => {
				throw new TypeError("getaddrinfo ENOTFOUND");
			}
		});

		const error = await captureRejection(newProvider().getGameById(1));

		const serviceError = assertServiceError(error, "IGDB_REQUEST_ERROR");
		assert.equal(
			serviceError.serviceError.raw,
			"IGDB token request failed before a response: getaddrinfo ENOTFOUND"
		);
		assert.equal(igdbCalls.length, 0);
	});
});

void describe("IgdbProvider error statuses", () => {
	const calls: [string, (provider: IgdbProvider) => Promise<unknown>][] = [
		["searchGame", provider => provider.searchGame("x")],
		["getGameById", provider => provider.getGameById(1)],
		["getGameBySlug", provider => provider.getGameBySlug("x")]
	];

	for (const [name, call] of calls) {
		void it(`${name} fails with IGDB_RATE_LIMITED on a 429`, async () => {
			stubIgdbNetwork({
				igdb: () => jsonResponse({ message: "Too Many Requests" }, 429)
			});

			const error = await captureRejection(call(newProvider()));

			assertServiceError(error, "IGDB_RATE_LIMITED");
		});

		for (const status of [400, 403, 404, 500, 502]) {
			void it(`${name} fails with IGDB_REQUEST_ERROR on a ${status}`, async () => {
				stubIgdbNetwork({
					igdb: () =>
						new Response("upstream failure", {
							status,
							statusText: "Upstream Failure"
						})
				});

				const error = await captureRejection(call(newProvider()));

				const serviceError = assertServiceError(
					error,
					"IGDB_REQUEST_ERROR"
				);
				assert.equal(
					serviceError.serviceError.raw,
					`IGDB API returned ${status}: Upstream Failure`
				);
			});
		}

		void it(`${name} fails with IGDB_REQUEST_ERROR describing the cause when the network fails`, async () => {
			stubIgdbNetwork({
				igdb: () => {
					throw new TypeError("fetch failed");
				}
			});

			const error = await captureRejection(call(newProvider()));

			const serviceError = assertServiceError(
				error,
				"IGDB_REQUEST_ERROR"
			);
			assert.equal(
				serviceError.serviceError.raw,
				"IGDB request failed before a response: fetch failed"
			);
		});

		void it(`${name} fails with IGDB_REQUEST_ERROR when fetch rejects with something that is not an Error`, async () => {
			stubIgdbNetwork({
				igdb: () => {
					throw "socket closed";
				}
			});

			const error = await captureRejection(call(newProvider()));

			const serviceError = assertServiceError(
				error,
				"IGDB_REQUEST_ERROR"
			);
			assert.equal(
				serviceError.serviceError.raw,
				"IGDB request failed before a response: unknown"
			);
		});

		void it(`${name} fails with IGDB_PARSE_ERROR keeping the SyntaxError when the body is not valid JSON`, async () => {
			stubIgdbNetwork({
				igdb: () =>
					new Response("<html>gateway</html>", { status: 200 })
			});

			const error = await captureRejection(call(newProvider()));

			const serviceError = assertServiceError(error, "IGDB_PARSE_ERROR");
			assert.ok(serviceError.serviceError.raw instanceof SyntaxError);
		});

		for (const body of [{ games: [] }, "elden ring", 42, null]) {
			void it(`${name} fails with IGDB_PARSE_ERROR when the JSON body is ${JSON.stringify(body)}`, async () => {
				stubIgdbNetwork({ igdb: () => jsonResponse(body) });

				const error = await captureRejection(call(newProvider()));

				assertServiceError(error, "IGDB_PARSE_ERROR");
			});
		}
	}
});
