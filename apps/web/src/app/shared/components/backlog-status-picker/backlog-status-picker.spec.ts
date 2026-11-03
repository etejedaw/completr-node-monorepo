import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { PointerService } from "../../../core/services/pointer";
import { ViewportService } from "../../../core/services/viewport";
import { BacklogStatusPicker } from "./backlog-status-picker";

describe("BacklogStatusPicker", () => {
	async function renderPicker(
		inputs: Record<string, unknown> = {},
		device: { mobile?: boolean; coarse?: boolean } = {}
	) {
		const statusChange = vi.fn();
		const view = await render(BacklogStatusPicker, {
			inputs: { status: "playing", subject: "Hades", ...inputs },
			on: { statusChange },
			providers: [
				{
					provide: ViewportService,
					useValue: { isMobile: signal(device.mobile ?? false) }
				},
				{
					provide: PointerService,
					useValue: { isCoarse: signal(device.coarse ?? false) }
				}
			]
		});
		return { statusChange, view };
	}

	function trigger() {
		return screen.getByRole("button", { name: "Status of Hades: Playing" });
	}

	describe("trigger", () => {
		it("shows the status as a badge with its label and icon", async () => {
			await renderPicker();

			expect(trigger()).toHaveTextContent("Playing");
			expect(trigger()).toHaveTextContent("play_circle");
			expect(trigger().querySelector("ui-badge")).toHaveClass(
				"text-playing"
			);
		});

		it("is named without a subject when none is given", async () => {
			await renderPicker({ subject: null, status: "not_started" });

			expect(
				screen.getByRole("button", { name: "Status: Not Started" })
			).toBeInTheDocument();
		});

		it("announces a menu on desktop and a dialog on narrow or touch screens", async () => {
			await renderPicker();
			expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
		});

		it("announces a dialog with a coarse pointer on a wide screen", async () => {
			await renderPicker({}, { coarse: true });
			expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
		});

		it("does not let the click reach the row or card behind it", async () => {
			const user = userEvent.setup();
			const { view } = await renderPicker();
			const rowClick = vi.fn();
			view.container.addEventListener("click", rowClick);

			await user.click(trigger());

			expect(rowClick).not.toHaveBeenCalled();
		});

		it("is disabled and busy while the status is being saved", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker({ disabled: true });

			expect(trigger()).toBeDisabled();
			expect(trigger()).toHaveAttribute("aria-busy", "true");
			await user.click(trigger());

			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			expect(statusChange).not.toHaveBeenCalled();
		});
	});

	describe("on desktop", () => {
		it("lists every status in a menu and emits the chosen one", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker();

			await user.click(trigger());
			const menu = await screen.findByRole("menu", {
				name: "Change status"
			});
			const items = within(menu).getAllByRole("menuitemradio");
			expect(items).toHaveLength(5);
			[
				"Not Started",
				"Playing",
				"Completed",
				"Endless",
				"Abandoned"
			].forEach((name, index) =>
				expect(items[index]).toHaveAccessibleName(name)
			);
			expect(
				within(menu).getByRole("menuitemradio", { name: /Playing/ })
			).toHaveAttribute("aria-checked", "true");

			await user.click(
				within(menu).getByRole("menuitemradio", { name: /Completed/ })
			);

			expect(statusChange).toHaveBeenCalledExactlyOnceWith("completed");
			await waitFor(() =>
				expect(screen.queryByRole("menu")).not.toBeInTheDocument()
			);
		});

		it("only offers the statuses it is given", async () => {
			const user = userEvent.setup();
			await renderPicker({ options: ["playing", "abandoned"] });

			await user.click(trigger());
			const menu = await screen.findByRole("menu");

			expect(within(menu).getAllByRole("menuitemradio")).toHaveLength(2);
		});

		it("does not emit when the current status is picked again", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker();

			await user.click(trigger());
			await user.dblClick(
				within(await screen.findByRole("menu")).getByRole(
					"menuitemradio",
					{ name: /Playing/ }
				)
			);

			expect(statusChange).not.toHaveBeenCalled();
		});

		it("emits once when an option is double clicked", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker();

			await user.click(trigger());
			await user.dblClick(
				within(await screen.findByRole("menu")).getByRole(
					"menuitemradio",
					{ name: /Endless/ }
				)
			);

			expect(statusChange).toHaveBeenCalledExactlyOnceWith("endless");
		});

		it("chooses with the keyboard and returns the focus to the trigger", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker();

			trigger().focus();
			await user.keyboard("{Enter}");
			await screen.findByRole("menu");
			await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

			expect(statusChange).toHaveBeenCalledTimes(1);
			await waitFor(() =>
				expect(screen.queryByRole("menu")).not.toBeInTheDocument()
			);
			await waitFor(() => expect(trigger()).toHaveFocus());
		});

		it("closes with Escape without emitting", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker();

			await user.click(trigger());
			await screen.findByRole("menu");
			await user.keyboard("{Escape}");

			await waitFor(() =>
				expect(screen.queryByRole("menu")).not.toBeInTheDocument()
			);
			expect(statusChange).not.toHaveBeenCalled();
		});

		it("never opens a bottom sheet", async () => {
			const user = userEvent.setup();
			await renderPicker();

			await user.click(trigger());

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("on mobile", () => {
		it("opens a sheet named after the game and emits the chosen status", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker({}, { mobile: true });

			await user.click(trigger());
			const sheet = await screen.findByRole("dialog", {
				name: "Change status"
			});
			expect(sheet).toHaveTextContent("Hades");
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			expect(
				within(sheet).getByRole("button", { name: /Playing/ })
			).toHaveAttribute("aria-pressed", "true");

			await user.click(
				within(sheet).getByRole("button", { name: /Abandoned/ })
			);

			expect(statusChange).toHaveBeenCalledExactlyOnceWith("abandoned");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
		});

		it("emits once when an option is tapped twice in a row", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker({}, { mobile: true });

			await user.click(trigger());
			const option = within(await screen.findByRole("dialog")).getByRole(
				"button",
				{ name: /Completed/ }
			);
			await user.dblClick(option);

			expect(statusChange).toHaveBeenCalledExactlyOnceWith("completed");
		});

		it("closes the sheet with its close button without emitting", async () => {
			const user = userEvent.setup();
			const { statusChange } = await renderPicker({}, { mobile: true });

			await user.click(trigger());
			const sheet = await screen.findByRole("dialog");
			await user.click(
				within(sheet).getByRole("button", { name: "Close" })
			);

			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			expect(statusChange).not.toHaveBeenCalled();
		});

		it("disables the options when a save starts with the sheet open", async () => {
			const user = userEvent.setup();
			const { statusChange, view } = await renderPicker(
				{},
				{ mobile: true }
			);

			await user.click(trigger());
			const sheet = await screen.findByRole("dialog");
			view.fixture.componentRef.setInput("disabled", true);
			view.fixture.detectChanges();
			const option = within(sheet).getByRole("button", {
				name: /Completed/
			});

			expect(option).toBeDisabled();
			await user.click(option);
			expect(statusChange).not.toHaveBeenCalled();
		});

		it("follows a status that changes while the sheet is open", async () => {
			const user = userEvent.setup();
			const { statusChange, view } = await renderPicker(
				{},
				{ mobile: true }
			);

			await user.click(trigger());
			const sheet = await screen.findByRole("dialog");
			view.fixture.componentRef.setInput("status", "completed");
			view.fixture.detectChanges();

			expect(
				within(sheet).getByRole("button", { name: /Completed/ })
			).toHaveAttribute("aria-pressed", "true");
			await user.click(
				within(sheet).getByRole("button", { name: /Completed/ })
			);
			expect(statusChange).not.toHaveBeenCalled();
		});
	});
});
