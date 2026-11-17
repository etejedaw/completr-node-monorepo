import { gameArtUrl } from "./game-art";

const COVER =
	"https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg";
const BACKGROUND = "https://media.rawg.io/media/games/abc/background.jpg";

describe("gameArtUrl", () => {
	it("prefers the cover in portrait slots and the background in landscape slots", () => {
		const game = { coverUrl: COVER, backgroundUrl: BACKGROUND };

		expect(gameArtUrl(game, "portrait")).toBe(COVER);
		expect(gameArtUrl(game, "landscape")).toBe(BACKGROUND);
	});

	it("falls back to the background for a game without cover in either slot", () => {
		const game = { coverUrl: null, backgroundUrl: BACKGROUND };

		expect(gameArtUrl(game, "portrait")).toBe(BACKGROUND);
		expect(gameArtUrl(game, "landscape")).toBe(BACKGROUND);
	});

	it("falls back to the cover for a cover-only game in either slot", () => {
		const game = { coverUrl: COVER };

		expect(gameArtUrl(game, "portrait")).toBe(COVER);
		expect(gameArtUrl(game, "landscape")).toBe(COVER);
	});

	it.each([
		["empty strings", { coverUrl: "", backgroundUrl: "" }],
		["blank strings", { coverUrl: "   ", backgroundUrl: "\t" }],
		["nulls", { coverUrl: null, backgroundUrl: null }],
		["no fields", {}]
	])("returns null for a game without art (%s)", (_label, game) => {
		expect(gameArtUrl(game, "portrait")).toBeNull();
		expect(gameArtUrl(game, "landscape")).toBeNull();
	});

	it("skips a blank preferred art and uses the other one", () => {
		expect(
			gameArtUrl({ coverUrl: " ", backgroundUrl: BACKGROUND }, "portrait")
		).toBe(BACKGROUND);
		expect(
			gameArtUrl({ coverUrl: COVER, backgroundUrl: "" }, "landscape")
		).toBe(COVER);
	});

	it.each([null, undefined])("returns null when the game is %j", game => {
		expect(gameArtUrl(game, "portrait")).toBeNull();
		expect(gameArtUrl(game, "landscape")).toBeNull();
	});
});
