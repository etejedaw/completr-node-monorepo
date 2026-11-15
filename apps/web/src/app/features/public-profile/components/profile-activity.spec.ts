import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type PublicActivity } from "../public-profile.model";
import { ProfileActivity } from "./profile-activity";

function activity(id: string, overrides: Partial<PublicActivity> = {}) {
	return {
		id,
		type: "backlog_completed",
		createdAt: "2026-02-01T00:00:00.000Z",
		target: null,
		game: {
			type: "game",
			id: `g-${id}`,
			name: `Game ${id}`,
			code: id,
			backgroundUrl: null
		},
		...overrides
	} as PublicActivity;
}

describe("ProfileActivity", () => {
	function renderActivity(
		inputs: { activities: PublicActivity[]; deletable?: boolean },
		deleted = vi.fn()
	) {
		return render(ProfileActivity, {
			inputs,
			on: { deleted },
			providers: [provideRouter([])]
		});
	}

	it("lists the activities with a link to each game", async () => {
		await renderActivity({ activities: [activity("a1"), activity("a2")] });

		expect(await screen.findAllByRole("listitem")).toHaveLength(2);
		expect(
			screen.getAllByRole("link", { name: "Game a1" }).length
		).toBeGreaterThan(0);
	});

	it("offers no remove button to a visitor", async () => {
		await renderActivity({ activities: [activity("a1")] });

		expect(
			screen.queryByRole("button", { name: "Remove this activity" })
		).not.toBeInTheDocument();
	});

	it("emits the id of the activity whose remove button was pressed", async () => {
		const deleted = vi.fn();
		await renderActivity(
			{ activities: [activity("a1"), activity("a2")], deletable: true },
			deleted
		);

		await userEvent.click(
			screen.getAllByRole("button", { name: "Remove this activity" })[1]
		);

		expect(deleted).toHaveBeenCalledTimes(1);
		expect(deleted).toHaveBeenCalledWith("a2");
	});

	it("renders an empty list without failing when there is nothing to show", async () => {
		await renderActivity({ activities: [], deletable: true });

		expect(screen.queryAllByRole("listitem")).toHaveLength(0);
	});

	it("falls back to an icon when the activity has no game", async () => {
		await renderActivity({
			activities: [activity("a1", { game: null })]
		});

		expect(screen.getAllByRole("listitem")).toHaveLength(1);
	});
});
