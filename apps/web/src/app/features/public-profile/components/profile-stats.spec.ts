import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type BacklogStats } from "../public-profile.model";
import { ProfileStats } from "./profile-stats";

const stats: BacklogStats = {
	not_started: 5,
	playing: 2,
	completed: 10,
	abandoned: 3,
	total: 20
};

describe("ProfileStats", () => {
	function renderStats(inputs: Record<string, unknown> = {}) {
		return render(ProfileStats, {
			providers: [provideRouter([])],
			inputs: {
				username: "ada",
				stats,
				listsTotal: 4,
				reviewsTotal: 7,
				...inputs
			}
		});
	}

	it("shows the library, lists and reviews counters", async () => {
		await renderStats();

		expect(
			screen.getByRole("link", { name: /^Completed\s*10$/ })
		).toHaveAttribute("href", "/user/ada/backlog?status=completed");
		expect(
			screen.getByRole("link", { name: /In library\s*20/ })
		).toHaveAttribute("href", "/user/ada/backlog");
		expect(
			screen.getByRole("button", { name: /Lists\s*4/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Reviews\s*7/ })
		).toHaveAttribute("href", "/user/ada/reviews");
	});

	it("breaks the library down by status with percentages", async () => {
		await renderStats();

		expect(screen.getByText("Library breakdown")).toBeInTheDocument();
		expect(screen.getByRole("img")).toHaveAttribute(
			"aria-label",
			"Library: 10 completed, 2 playing, 5 to play, 3 dropped"
		);
		expect(
			screen.getByRole("link", { name: /Completed\s*10\s*\(50%\)/ })
		).toHaveAttribute("href", "/user/ada/backlog?status=completed");
		expect(
			screen.getByRole("link", { name: /Dropped\s*3\s*\(15%\)/ })
		).toBeInTheDocument();
	});

	it("omits the statuses without games from the breakdown", async () => {
		await renderStats({
			stats: { ...stats, playing: 0, abandoned: 0, total: 15 }
		});

		expect(
			screen.queryByRole("link", { name: /Playing/ })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /Dropped/ })
		).not.toBeInTheDocument();
	});

	it("hides the library counters and breakdown when the backlog is private", async () => {
		await renderStats({ showLibrary: false });

		expect(
			screen.queryByRole("link", { name: /Completed/ })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /In library/ })
		).not.toBeInTheDocument();
		expect(screen.queryByText("Library breakdown")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Lists/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Reviews/ })
		).toBeInTheDocument();
	});

	it("skips the breakdown when the library is empty", async () => {
		await renderStats({
			stats: {
				not_started: 0,
				playing: 0,
				completed: 0,
				abandoned: 0,
				total: 0
			}
		});

		expect(screen.queryByText("Library breakdown")).not.toBeInTheDocument();
	});

	it("emits listsOpened when the lists counter is clicked", async () => {
		const user = userEvent.setup();
		const listsOpened = vi.fn();
		await render(ProfileStats, {
			providers: [provideRouter([])],
			inputs: { username: "ada", stats },
			on: { listsOpened }
		});

		await user.click(screen.getByRole("button", { name: /Lists/ }));

		expect(listsOpened).toHaveBeenCalledTimes(1);
	});
});
