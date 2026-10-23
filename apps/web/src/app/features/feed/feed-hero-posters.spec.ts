import { type ActivityTarget, type FeedActivity } from "./feed";
import { gamePosters } from "./feed-hero-posters";

function game(id: string, backgroundUrl?: string): ActivityTarget {
	return {
		type: "game",
		id,
		name: `Game ${id}`,
		code: `game-${id}`,
		backgroundUrl
	};
}

function activity(overrides: Partial<FeedActivity>): FeedActivity {
	return {
		id: Math.random().toString(),
		type: "backlog_added",
		createdAt: "2026-10-20T00:00:00.000Z",
		user: null,
		target: null,
		game: null,
		...overrides
	};
}

describe("gamePosters", () => {
	it("uses the game target of regular activities", () => {
		const posters = gamePosters([
			activity({ target: game("a", "https://img.test/a.jpg") }),
			activity({
				type: "backlog_completed",
				target: game("b", "https://img.test/b.jpg")
			})
		]);

		expect(posters).toEqual([
			{ src: "https://img.test/a.jpg", title: "Game a" },
			{ src: "https://img.test/b.jpg", title: "Game b" }
		]);
	});

	it("uses the game of co-op activities whose target is a user", () => {
		const posters = gamePosters([
			activity({
				type: "coop_tagged",
				target: {
					type: "user",
					id: "u1",
					name: "Friend",
					username: "friend"
				},
				game: game("farm", "https://img.test/farm.jpg")
			})
		]);

		expect(posters).toEqual([
			{ src: "https://img.test/farm.jpg", title: "Game farm" }
		]);
	});

	it("skips lists, users and games without a background", () => {
		const posters = gamePosters([
			activity({
				type: "list_created",
				target: { type: "list", id: "l1", name: "My list" }
			}),
			activity({
				type: "user_followed",
				target: { type: "user", id: "u1", name: "Friend" }
			}),
			activity({ target: game("c") })
		]);

		expect(posters).toEqual([]);
	});

	it("shows each game once even when several activities point to it", () => {
		const posters = gamePosters([
			activity({ target: game("a", "https://img.test/a.jpg") }),
			activity({
				type: "backlog_playing",
				target: game("a", "https://img.test/a.jpg")
			}),
			activity({
				type: "coop_tagged",
				target: { type: "user", id: "u1", name: "Friend" },
				game: game("a", "https://img.test/a.jpg")
			})
		]);

		expect(posters).toHaveLength(1);
	});
});
