import { mock } from "node:test";

import { type IgdbGame } from "../../src/igdb/igdb.interface";

export const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
export const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";

export interface RecordedCall {
	url: string;
	init: RequestInit;
}

export type CallHandler = (
	call: RecordedCall,
	index: number
) => Response | Promise<Response>;

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" }
	});
}

export function tokenResponse(accessToken: string, expiresIn = 3600) {
	return jsonResponse({
		access_token: accessToken,
		expires_in: expiresIn,
		token_type: "bearer"
	});
}

export function tokenSequence(...accessTokens: string[]): CallHandler {
	return (_call, index) =>
		tokenResponse(accessTokens[index] ?? accessTokens.at(-1) ?? "token");
}

export function stubIgdbNetwork(handlers: {
	token?: CallHandler;
	igdb?: CallHandler;
}) {
	const tokenCalls: RecordedCall[] = [];
	const igdbCalls: RecordedCall[] = [];

	mock.method(globalThis, "fetch", (async (
		input: Parameters<typeof fetch>[0],
		init: RequestInit = {}
	) => {
		const url = String(input);
		const call = { url, init };
		if (url === TWITCH_TOKEN_URL) {
			tokenCalls.push(call);
			const handler = handlers.token ?? tokenSequence("token-1");
			return handler(call, tokenCalls.length - 1);
		}
		if (url === IGDB_GAMES_URL) {
			igdbCalls.push(call);
			const handler = handlers.igdb ?? (() => jsonResponse([]));
			return handler(call, igdbCalls.length - 1);
		}
		throw new Error(`Unexpected fetch to ${url}`);
	}) as typeof fetch);

	return { tokenCalls, igdbCalls };
}

export function headersOf(call: RecordedCall) {
	return new Headers(call.init.headers);
}

export function bodyOf(call: RecordedCall) {
	return String(call.init.body);
}

export function createGate() {
	let open!: () => void;
	const opened = new Promise<undefined>(settle => {
		open = () => settle(undefined);
	});
	return { opened, open };
}

export const ELDEN_RING: IgdbGame = {
	id: 119133,
	name: "Elden Ring",
	slug: "elden-ring",
	summary: "An action RPG.",
	first_release_date: 1645747200,
	rating: 95.4,
	rating_count: 1200,
	url: "https://www.igdb.com/games/elden-ring",
	game_type: { id: 0, type: "Main Game" },
	cover: { id: 212094, image_id: "co4jni" },
	platforms: [
		{ id: 6, slug: "win" },
		{ id: 167, slug: "ps5" }
	],
	genres: [{ id: 12, slug: "role-playing-rpg" }],
	themes: [{ id: 17, slug: "fantasy" }]
};

export const BARE_GAME: IgdbGame = {
	id: 42,
	name: "Obscure Prototype",
	slug: "obscure-prototype"
};
