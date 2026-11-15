import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UserResult } from "../../../core/services/users.model";
import { UserCard } from "./user-card";

function user(overrides: Partial<UserResult> = {}): UserResult {
	return {
		id: "u1",
		username: "ada",
		name: "Ada",
		avatarUrl: null,
		profileVisibility: "public",
		followerCount: 3,
		gamesTotal: 10,
		completedTotal: 4,
		...overrides
	};
}

describe("UserCard", () => {
	function renderCard(inputs: Record<string, unknown> = {}, on = {}) {
		return render(UserCard, {
			inputs: { user: user(), canFollow: true, ...inputs },
			on,
			providers: [provideRouter([])]
		});
	}

	it("labels the follow button with the state and the person", async () => {
		await renderCard({ followState: "requested" });

		expect(
			screen.getByRole("button", { name: "Requested Ada" })
		).toBeInTheDocument();
	});

	it("emits once per click and does not fire while busy", async () => {
		const followToggled = vi.fn();
		await renderCard({ busy: true }, { followToggled });

		await userEvent.dblClick(
			screen.getByRole("button", { name: "Follow Ada" })
		);

		expect(followToggled).not.toHaveBeenCalled();
	});

	it("marks a restricted profile with an image role and hides follower data", async () => {
		await renderCard({
			user: user({
				profileVisibility: "private",
				followerCount: null,
				gamesTotal: null
			})
		});

		expect(
			screen.getByRole("img", { name: "Restricted profile" })
		).toBeInTheDocument();
		expect(
			screen.getByText("Private profile — follow to request access")
		).toBeInTheDocument();
	});

	it("shows a placeholder for stats that are not shared", async () => {
		await renderCard({ user: user({ gamesTotal: null }) });

		expect(
			screen.getByText("Library not shared with you")
		).toBeInTheDocument();
	});
});
