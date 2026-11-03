import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { type SavedFilter } from "../saved-filters.model";
import { SavedViewCard } from "./saved-view-card";

function savedView(overrides: Partial<SavedFilter> = {}): SavedFilter {
	return {
		id: "v1",
		name: "Playing on PC",
		filters: { status: "playing,completed", platforms: "p1" },
		sortBy: "ratio",
		sortOrder: "desc",
		showInBacklog: true,
		isDefault: false,
		enabledStats: null,
		icon: null,
		color: null,
		createdAt: "2026-01-01T00:00:00Z",
		...overrides
	};
}

describe("SavedViewCard", () => {
	async function renderCard(
		variant: "card" | "row" = "card",
		mobile = false
	) {
		const events = {
			shared: vi.fn(),
			duplicated: vi.fn(),
			edited: vi.fn()
		};
		await render(SavedViewCard, {
			inputs: { view: savedView(), variant },
			on: events,
			providers: [
				provideRouter([]),
				{
					provide: ViewportService,
					useValue: { isMobile: signal(mobile) }
				}
			]
		});
		return events;
	}

	function moreButton() {
		return screen.getByRole("button", {
			name: "More actions for Playing on PC"
		});
	}

	it.each<"card" | "row">(["card", "row"])(
		"shows the filters of the %s as badges, with the statuses in their own colors",
		async variant => {
			await renderCard(variant);
			const filters = within(
				screen.getByRole("list", { name: "Filters" })
			);

			expect(
				filters.getByText("Playing").closest("ui-badge")
			).toHaveClass("text-playing");
			expect(
				filters.getByText("Completed").closest("ui-badge")
			).toHaveClass("text-success");
			expect(
				filters.getByText("Platform").closest("ui-badge")
			).toHaveClass("text-brand");
			expect(filters.getByText("Ratio ↓")).toBeInTheDocument();
		}
	);

	it.each<"card" | "row">(["card", "row"])(
		"paints the rating filter of the %s with the rating badge tone",
		async variant => {
			await render(SavedViewCard, {
				inputs: {
					view: savedView({ filters: { min_rating: "4" } }),
					variant
				},
				providers: [
					provideRouter([]),
					{
						provide: ViewportService,
						useValue: { isMobile: signal(false) }
					}
				]
			});
			const badge = within(screen.getByRole("list", { name: "Filters" }))
				.getByText(/rating/i)
				.closest("ui-badge");

			expect(badge).toHaveClass("text-rating");
			expect(badge?.className).not.toContain("!");
		}
	);

	it("uses a ghost ⋮ trigger for its actions", async () => {
		await renderCard();

		expect(moreButton()).toHaveAttribute("data-variant", "ghost");
	});

	it("runs the chosen action once from the More actions menu, even on a double click", async () => {
		const user = userEvent.setup();
		const events = await renderCard();

		await user.click(moreButton());
		const menu = await screen.findByRole("menu", { name: "Playing on PC" });
		await user.dblClick(
			within(menu).getByRole("menuitem", { name: "Duplicate" })
		);

		expect(events.duplicated).toHaveBeenCalledTimes(1);
		expect(events.shared).not.toHaveBeenCalled();
		expect(events.edited).not.toHaveBeenCalled();
	});

	it("does nothing when the menu is dismissed with Escape", async () => {
		const user = userEvent.setup();
		const events = await renderCard("row");

		await user.click(moreButton());
		await screen.findByRole("menu");
		await user.keyboard("{Escape}");

		await waitFor(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		);
		await waitFor(() => expect(moreButton()).toHaveFocus());
		expect(events.shared).not.toHaveBeenCalled();
		expect(events.duplicated).not.toHaveBeenCalled();
		expect(events.edited).not.toHaveBeenCalled();
	});

	it("opens a sheet on mobile and closes it after an action", async () => {
		const user = userEvent.setup();
		const events = await renderCard("card", true);

		await user.click(moreButton());
		const sheet = await screen.findByRole("dialog", {
			name: "Playing on PC"
		});
		await user.click(within(sheet).getByRole("button", { name: "Edit" }));

		expect(events.edited).toHaveBeenCalledTimes(1);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
	});

	it("keeps the desktop shortcuts named after the view", async () => {
		const user = userEvent.setup();
		const events = await renderCard();

		await user.click(
			screen.getByRole("button", {
				name: "Copy public link to Playing on PC"
			})
		);

		expect(events.shared).toHaveBeenCalledTimes(1);
	});
});
