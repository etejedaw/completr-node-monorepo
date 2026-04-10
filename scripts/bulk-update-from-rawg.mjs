/**
 * Bulk update all games from RAWG API.
 * Uses backend endpoints for all writes.
 *
 * Updates per game:
 * - GameScore (rawg rating) — create or update
 * - GameScore (metacritic) — update if changed
 * - GameTime (rawg playtime) — create or update
 * - Game description, coverUrl, releaseAt — update via PATCH
 * - Game platforms, genres — update via PATCH
 * - GameExternalId — create if missing
 *
 * Usage: node scripts/bulk-update-from-rawg.mjs
 */

const BASE_URL = "http://localhost:3000";
const RAWG_KEY = process.env.RAWG_API_KEY || "dfc7c532ae184be39040b693620cf91c";
const DELAY_MS = 300; // delay between RAWG calls to avoid rate limit

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getToken() {
	const res = await fetch(`${BASE_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@completr.app", password: "Completr123456+" })
	});
	const data = await res.json();
	return data.data.access_token;
}

async function getAllGames(token) {
	const res = await fetch(`${BASE_URL}/games`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const data = await res.json();
	return data.data.games;
}

async function getRawgDetail(rawgId) {
	const res = await fetch(`https://api.rawg.io/api/games/${rawgId}?key=${RAWG_KEY}`);
	if (!res.ok) return null;
	return await res.json();
}

async function getRawgBySlug(slug) {
	const res = await fetch(`https://api.rawg.io/api/games/${slug}?key=${RAWG_KEY}`);
	if (!res.ok) return null;
	return await res.json();
}

async function upsertScore(token, gameId, source, score) {
	// Try create first
	const createRes = await fetch(`${BASE_URL}/game-scores`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ gameId, source, score })
	});
	if (createRes.ok) return "created";

	// If 409 (already exists), update
	const createData = await createRes.json();
	if (createData.status === 409) {
		const updateRes = await fetch(`${BASE_URL}/game-scores/${gameId}/${source}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ score })
		});
		return updateRes.ok ? "updated" : "update-failed";
	}
	return "create-failed";
}

async function upsertTime(token, gameId, source, duration) {
	const createRes = await fetch(`${BASE_URL}/game-times`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ gameId, source, duration })
	});
	if (createRes.ok) return "created";

	const createData = await createRes.json();
	if (createData.status === 409) {
		const updateRes = await fetch(`${BASE_URL}/game-times/${gameId}/${source}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ duration })
		});
		return updateRes.ok ? "updated" : "update-failed";
	}
	return "create-failed";
}

async function updateGame(token, gameId, data) {
	const res = await fetch(`${BASE_URL}/games/${gameId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify(data)
	});
	return res.ok;
}

// Platform slug mapping (RAWG → Completr)
const PLATFORM_MAP = {
	pc: ["steam", "gog", "pc-epic-games", "ea-origin", "origin", "blizzard-battlenet"],
	playstation5: "playstation-5", playstation4: "playstation-4",
	playstation3: "playstation-3", playstation2: "playstation-2",
	playstation1: "playstation", "ps-vita": "playstation-vita",
	psp: "playstation-portable", "xbox-series-x": "xbox-series-xors",
	"xbox-one": "xbox-one", xbox360: "xbox-360", "xbox-old": "xbox",
	"nintendo-switch": "nintendo-switch", "wii-u": "nintendo-wii-u",
	wii: "nintendo-wii", gamecube: "nintendo-gamecube",
	"nintendo-64": "nintendo-64", "nintendo-3ds": "nintendo-3ds",
	"nintendo-ds": "nintendo-ds", "game-boy-advance": "game-boy-advance",
	"game-boy-color": "game-boy-color", "game-boy": "game-boy",
	snes: "super-nintendo", nes: "nintendo-entertainment-system",
	"sega-genesis": "sega-genesis", ios: "ios", android: "android"
};

const GENRE_MAP = {
	action: "action", indie: "indie", adventure: "adventure",
	"role-playing-games-rpg": "rpg", strategy: "strategy",
	shooter: "shooter", casual: "casual", simulation: "simulation",
	puzzle: "puzzle", arcade: "arcade", platformer: "platformer",
	"massively-multiplayer": "massively-multiplayer", racing: "racing",
	sports: "sports", fighting: "fighting", family: "family",
	"board-games": "board-games", card: "card-game", educational: "educational"
};

function mapPlatforms(rawgPlatforms) {
	const codes = [];
	for (const p of rawgPlatforms) {
		const slug = p.platform.slug;
		const mapped = PLATFORM_MAP[slug];
		if (Array.isArray(mapped)) codes.push(...mapped);
		else if (mapped) codes.push(mapped);
	}
	return [...new Set(codes)];
}

function mapGenres(rawgGenres) {
	return rawgGenres.map(g => GENRE_MAP[g.slug]).filter(Boolean);
}

async function main() {
	console.log("Getting token...");
	const token = await getToken();

	console.log("Fetching all games...");
	const games = await getAllGames(token);
	console.log(`Total games: ${games.length}\n`);

	const results = { success: 0, failed: 0, notFound: 0, errors: [] };

	for (let i = 0; i < games.length; i++) {
		const game = games[i];
		const progress = `[${i + 1}/${games.length}]`;

		try {
			// Try to find on RAWG by slug
			await sleep(DELAY_MS);
			const rawg = await getRawgBySlug(game.code);

			if (!rawg || !rawg.id) {
				console.log(`${progress} ✗ NOT FOUND on RAWG: ${game.title} (${game.code})`);
				results.notFound++;
				results.errors.push({ title: game.title, code: game.code, error: "Not found on RAWG" });
				continue;
			}

			const updates = [];

			// 1. RAWG score
			if (rawg.rating > 0) {
				const r = await upsertScore(token, game.id, "rawg", rawg.rating);
				updates.push(`rawg-score:${r}`);
			}

			// 2. Metacritic score
			if (rawg.metacritic) {
				const r = await upsertScore(token, game.id, "metacritic", rawg.metacritic);
				updates.push(`mc-score:${r}`);
			}

			// 3. RAWG playtime
			if (rawg.playtime > 0) {
				const r = await upsertTime(token, game.id, "rawg", rawg.playtime);
				updates.push(`rawg-time:${r}`);
			}

			// 4. Update game fields + platforms + genres
			const patchData = {};
			if (rawg.description_raw) patchData.description = rawg.description_raw;
			if (rawg.background_image) patchData.coverUrl = rawg.background_image;
			if (rawg.released) patchData.releaseAt = rawg.released;

			const platforms = mapPlatforms(rawg.platforms || []);
			if (platforms.length > 0) patchData.platforms = platforms;

			const genres = mapGenres(rawg.genres || []);
			if (genres.length > 0) patchData.genres = genres;

			if (Object.keys(patchData).length > 0) {
				const ok = await updateGame(token, game.id, patchData);
				updates.push(`patch:${ok ? "ok" : "failed"}`);
			}

			console.log(`${progress} ✓ ${game.title} | ${updates.join(", ")}`);
			results.success++;

		} catch (err) {
			console.log(`${progress} ✗ ERROR: ${game.title} — ${err.message}`);
			results.failed++;
			results.errors.push({ title: game.title, code: game.code, error: err.message });
		}
	}

	console.log("\n=== RESULTS ===");
	console.log(`Success: ${results.success}`);
	console.log(`Not found: ${results.notFound}`);
	console.log(`Failed: ${results.failed}`);

	if (results.errors.length > 0) {
		console.log("\n=== ERRORS ===");
		results.errors.forEach(e => console.log(`  ${e.title} (${e.code}): ${e.error}`));
	}
}

main().catch(console.error);
