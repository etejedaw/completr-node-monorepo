import {
	pickProfileBackdrop,
	type ProfileBackdropSources
} from "./profile-backdrop";

type BacklogSource = NonNullable<
	ProfileBackdropSources["profile"]
>["backlogs"][number];
type ActivitySource = NonNullable<
	ProfileBackdropSources["profile"]
>["recentActivity"][number];

function favorite(backgroundUrl?: string) {
	return { game: { id: "g", code: "g", title: "Game", backgroundUrl } };
}

function backlog(backgroundUrl?: string): BacklogSource {
	return {
		id: "b",
		status: "playing",
		game: { id: "g", code: "g", title: "Game", backgroundUrl },
		platform: { id: "p", abbreviation: "PC" }
	};
}

function activity(backgroundUrl: string | null): ActivitySource {
	return {
		id: "a",
		type: "completed",
		createdAt: "2026-01-01T00:00:00.000Z",
		target: null,
		game: { type: "game", id: "g", name: "Game", code: "g", backgroundUrl }
	};
}

function profile(
	backlogs: BacklogSource[] = [],
	recentActivity: ActivitySource[] = []
): ProfileBackdropSources["profile"] {
	return { backlogs, recentActivity };
}

describe("pickProfileBackdrop", () => {
	it("waits for the favorites when the profile shows them", () => {
		expect(
			pickProfileBackdrop({
				profile: profile([backlog("backlog.jpg")]),
				favorites: null,
				showsFavorites: true
			})
		).toBeNull();
	});

	it("uses the first favorite that has art", () => {
		expect(
			pickProfileBackdrop({
				profile: profile([backlog("backlog.jpg")]),
				favorites: [
					favorite(),
					favorite("second.jpg"),
					favorite("third.jpg")
				],
				showsFavorites: true
			})
		).toBe("second.jpg");
	});

	it("falls back to the backlog when no favorite has art", () => {
		expect(
			pickProfileBackdrop({
				profile: profile([backlog(), backlog("backlog.jpg")]),
				favorites: [favorite()],
				showsFavorites: true
			})
		).toBe("backlog.jpg");
	});

	it("ignores the favorites when the profile hides them", () => {
		expect(
			pickProfileBackdrop({
				profile: profile([backlog("backlog.jpg")]),
				favorites: null,
				showsFavorites: false
			})
		).toBe("backlog.jpg");
	});

	it("falls back to the recent activity after the backlog", () => {
		expect(
			pickProfileBackdrop({
				profile: profile(
					[backlog()],
					[activity(null), activity("activity.jpg")]
				),
				favorites: [],
				showsFavorites: true
			})
		).toBe("activity.jpg");
	});

	it("returns null when nothing has art", () => {
		expect(
			pickProfileBackdrop({
				profile: profile([backlog()], [activity(null)]),
				favorites: [favorite()],
				showsFavorites: true
			})
		).toBeNull();
		expect(
			pickProfileBackdrop({
				profile: null,
				favorites: null,
				showsFavorites: false
			})
		).toBeNull();
	});
});
