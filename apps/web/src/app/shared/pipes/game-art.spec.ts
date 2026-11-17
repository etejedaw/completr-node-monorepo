import { GameArtPipe } from "./game-art";

describe("GameArtPipe", () => {
	const pipe = new GameArtPipe();
	const game = {
		coverUrl:
			"https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg",
		backgroundUrl: "https://media.rawg.io/media/games/abc/background.jpg"
	};

	it("picks the art that fits the slot orientation", () => {
		expect(pipe.transform(game, "portrait")).toBe(game.coverUrl);
		expect(pipe.transform(game, "landscape")).toBe(game.backgroundUrl);
	});

	it("returns null for a missing game", () => {
		expect(pipe.transform(undefined, "portrait")).toBeNull();
	});
});
