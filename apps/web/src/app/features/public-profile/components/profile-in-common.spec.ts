import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { COMPARISON_OPTIONS } from "../services/comparison-options";
import { ProfileInCommon } from "./profile-in-common";

const games = [
	{ id: "g1", code: "hades", title: "Hades", backgroundUrl: null },
	{ id: "g2", code: "celeste", title: "Celeste", backgroundUrl: "c.jpg" }
];

describe("ProfileInCommon", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});
	function renderInCommon(
		inputs: Record<string, unknown> = {},
		on: Record<string, (value: never) => void> = {}
	) {
		return render(ProfileInCommon, {
			providers: [provideRouter([])],
			inputs: {
				username: "grace",
				options: COMPARISON_OPTIONS,
				selected: "completed",
				...inputs
			},
			on
		});
	}

	it("shows the games both players share with the total and a link to all of them", async () => {
		await renderInCommon({ games, count: 9 });

		expect(
			screen.getByRole("heading", { name: /In common/ })
		).toBeInTheDocument();
		expect(screen.getByText("You & @grace")).toBeInTheDocument();
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(screen.getByRole("link", { name: /See all 9/ })).toHaveAttribute(
			"href",
			"/user/grace/in-common?by=completed"
		);
	});

	it("keeps the selected dimension in the see-all link", async () => {
		await renderInCommon({ games, count: 2, selected: "not_started" });

		expect(screen.getByRole("link", { name: /See all 2/ })).toHaveAttribute(
			"href",
			"/user/grace/in-common?by=not_started"
		);
	});

	it("offers the two comparison dimensions with the current one selected", async () => {
		await renderInCommon({ games, count: 2, selected: "not_started" });

		const group = screen.getByRole("radiogroup", { name: "Compare by" });
		expect(
			within(group).getByRole("radio", { name: "To play" })
		).toHaveAttribute("aria-checked", "true");
		expect(
			within(group).getByRole("radio", { name: "Completed" })
		).toHaveAttribute("aria-checked", "false");
	});

	it("emits the new dimension when the visitor switches the comparison", async () => {
		const user = userEvent.setup();
		const selectedChange = vi.fn();
		await renderInCommon({ games, count: 2 }, { selectedChange });

		await user.click(screen.getByRole("radio", { name: "To play" }));

		expect(selectedChange).toHaveBeenCalledWith("not_started");
	});

	it("shows skeletons while loading, even with games from a previous comparison", async () => {
		const { container } = await renderInCommon({
			games,
			count: 2,
			loading: true
		});

		expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
		expect(screen.queryAllByText("Hades")).toHaveLength(0);
	});

	it("says there is nothing in common and keeps the control to try the other comparison", async () => {
		await renderInCommon();

		expect(
			screen.getByText(
				"Nothing in common here yet. Try the other comparison."
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("radiogroup", { name: "Compare by" })
		).toBeInTheDocument();
	});

	it("says the library is private when access was denied", async () => {
		await renderInCommon({ isPrivate: true });

		expect(
			screen.getByText("This part of their library is private.")
		).toBeInTheDocument();
		expect(
			screen.queryByText(/Nothing in common here yet/)
		).not.toBeInTheDocument();
	});
});
