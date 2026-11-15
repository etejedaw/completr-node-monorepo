import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type FeedActivity } from "../feed.model";
import { FeedActivityItem } from "./feed-activity-item";

function activity(overrides: Partial<FeedActivity> = {}): FeedActivity {
	return {
		id: "a1",
		type: "backlog_completed",
		createdAt: "2026-05-01T10:30:00.000Z",
		user: {
			id: "u1",
			username: "ada",
			name: "Ada",
			avatarUrl: null
		},
		target: null,
		game: { type: "game", id: "g1", name: "Celeste", code: "celeste" },
		...overrides
	};
}

describe("FeedActivityItem", () => {
	async function renderItem(item: FeedActivity, isOwn = false) {
		return render(FeedActivityItem, {
			inputs: { activity: item, isOwn },
			providers: [provideRouter([])]
		});
	}

	it("links the actor and the game", async () => {
		await renderItem(activity());

		expect(screen.getByRole("link", { name: "Ada" })).toHaveAttribute(
			"href",
			"/user/ada"
		);
		expect(
			screen.getAllByRole("link", { name: "Celeste" })[0]
		).toHaveAttribute("href", "/games/celeste");
	});

	it("falls back to the username when the display name is empty", async () => {
		await renderItem(
			activity({
				user: { id: "u1", username: "ada", name: "", avatarUrl: null }
			})
		);

		expect(screen.getByRole("link", { name: "ada" })).toBeInTheDocument();
	});

	it("renders without actor or game when the data is missing", async () => {
		await renderItem(activity({ user: null, game: null }));

		expect(screen.queryByRole("link")).toBeNull();
	});

	it("shows the delete button only on own activity", async () => {
		const { rerender } = await renderItem(activity(), false);
		expect(
			screen.queryByRole("button", { name: "Remove this activity" })
		).toBeNull();

		await rerender({ inputs: { activity: activity(), isOwn: true } });
		expect(
			screen.getByRole("button", { name: "Remove this activity" })
		).toBeInTheDocument();
	});

	it("emits the id once per click, also on a double click", async () => {
		const deleted = vi.fn();
		await render(FeedActivityItem, {
			inputs: { activity: activity(), isOwn: true },
			on: { deleted },
			providers: [provideRouter([])]
		});

		await userEvent.dblClick(
			screen.getByRole("button", { name: "Remove this activity" })
		);

		expect(deleted).toHaveBeenCalledWith("a1");
	});
});
