import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ActionMenu } from "./action-menu";
import { type ActionMenuItem } from "./action-menu.model";

const ITEMS: ActionMenuItem[] = [
	{ id: "edit", label: "Edit list", icon: "edit" },
	{ id: "refresh", label: "Refresh scores", icon: "refresh", busy: true },
	{
		id: "json",
		label: "Download JSON",
		icon: "data_object",
		hint: "Premium perk",
		premium: true,
		locked: true,
		separated: true
	}
];

describe("ActionMenu", () => {
	let mobile = false;

	beforeEach(() => {
		mobile = false;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: mobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function renderMenu(inputs: Record<string, unknown> = {}) {
		const selected = vi.fn();
		await render(ActionMenu, {
			inputs: {
				label: "More list actions",
				heading: "List actions",
				items: ITEMS,
				iconOnly: true,
				...inputs
			},
			on: { selected }
		});
		return selected;
	}

	it("names an icon-only trigger after its label", async () => {
		await renderMenu();

		expect(
			screen.getByRole("button", { name: "More list actions" })
		).toHaveAttribute("aria-haspopup", "menu");
	});

	it("shows the text label when the trigger is not icon-only", async () => {
		await renderMenu({ label: "Export", iconOnly: false });

		expect(
			screen.getByRole("button", { name: "Export" })
		).toHaveTextContent("Export");
	});

	it("emits the chosen item and closes the menu", async () => {
		const user = userEvent.setup();
		const selected = await renderMenu();

		await user.click(
			screen.getByRole("button", { name: "More list actions" })
		);
		const menu = await screen.findByRole("menu", { name: "List actions" });
		await user.click(
			within(menu).getByRole("menuitem", { name: "Edit list" })
		);

		expect(selected).toHaveBeenCalledExactlyOnceWith("edit");
		await waitFor(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		);
	});

	it("ignores a busy item even when it is clicked twice", async () => {
		const user = userEvent.setup();
		const selected = await renderMenu();

		await user.click(
			screen.getByRole("button", { name: "More list actions" })
		);
		const menu = await screen.findByRole("menu", { name: "List actions" });
		await user.dblClick(
			within(menu).getByRole("menuitem", { name: "Refresh scores" })
		);

		expect(selected).not.toHaveBeenCalled();
		expect(menu).toBeInTheDocument();
	});

	it("still lets a locked item through so the API can explain the perk", async () => {
		const user = userEvent.setup();
		const selected = await renderMenu();

		await user.click(
			screen.getByRole("button", { name: "More list actions" })
		);
		const json = within(
			await screen.findByRole("menu", { name: "List actions" })
		).getByRole("menuitem", { name: "Download JSON" });
		expect(json).toHaveAccessibleDescription("Premium perk");
		await user.click(json);

		expect(selected).toHaveBeenCalledExactlyOnceWith("json");
	});

	it("uses the glass button over a hero and keeps primary as is", async () => {
		const { rerender } = await render(ActionMenu, {
			inputs: {
				label: "More list actions",
				heading: "List actions",
				items: ITEMS,
				iconOnly: true,
				placement: "hero"
			}
		});
		const trigger = () =>
			screen.getByRole("button", { name: "More list actions" });

		expect(trigger()).toHaveAttribute("data-variant", "glass");
		await rerender({
			inputs: {
				label: "More list actions",
				heading: "List actions",
				items: ITEMS,
				iconOnly: true,
				placement: "hero",
				variant: "primary"
			},
			partialUpdate: true
		});
		expect(trigger()).toHaveAttribute("data-variant", "primary");
	});

	it("marks the trigger busy while an action runs", async () => {
		await renderMenu({ busy: true });

		expect(
			screen.getByRole("button", { name: "More list actions" })
		).toHaveAttribute("aria-busy", "true");
	});

	it("uses the ghost variant for the ⋮ of rows and cards", async () => {
		await renderMenu({ icon: "more_vert", variant: "ghost" });

		expect(
			screen.getByRole("button", { name: "More list actions" })
		).toHaveAttribute("data-variant", "ghost");
	});

	it("counts the active options in the trigger name and badge", async () => {
		const { rerender } = await render(ActionMenu, {
			inputs: {
				label: "Filters & stats",
				heading: "Filters & stats",
				items: ITEMS,
				count: 0
			}
		});

		expect(
			screen.getByRole("button", { name: "Filters & stats" })
		).not.toHaveAttribute("data-active");
		expect(document.querySelector("ui-count-badge")).toBeNull();

		await rerender({
			inputs: {
				label: "Filters & stats",
				heading: "Filters & stats",
				items: ITEMS,
				count: 3,
				active: true
			},
			partialUpdate: true
		});
		const trigger = screen.getByRole("button", {
			name: "Filters & stats, 3 active"
		});
		expect(trigger).toHaveAttribute("data-active", "");
		expect(trigger.querySelector("ui-count-badge")).toHaveTextContent("3");
		expect(trigger.querySelector("ui-count-badge")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
	});

	it("counts the active options of an icon-only trigger too", async () => {
		await renderMenu({ count: 2 });

		expect(
			screen.getByRole("button", { name: "More list actions, 2 active" })
		).toBeInTheDocument();
	});

	it("moves the focus back to its trigger on request", async () => {
		const { fixture } = await render(ActionMenu, {
			inputs: { label: "Export", heading: "Export", items: ITEMS }
		});

		fixture.componentInstance.focusTrigger();

		expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
	});

	describe("on mobile", () => {
		beforeEach(() => {
			mobile = true;
		});

		it("opens a bottom sheet instead of a menu", async () => {
			const user = userEvent.setup();
			const selected = await renderMenu();

			await user.click(
				screen.getByRole("button", { name: "More list actions" })
			);
			const sheet = await screen.findByRole("dialog", {
				name: "List actions"
			});
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			expect(
				within(sheet).getByRole("button", { name: "Refresh scores" })
			).toBeDisabled();
			await user.click(
				within(sheet).getByRole("button", { name: "Edit list" })
			);

			expect(selected).toHaveBeenCalledExactlyOnceWith("edit");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
		});

		it("titles the sheet with the eyebrow and subheading", async () => {
			const user = userEvent.setup();
			await renderMenu({ eyebrow: "My Games", subheading: "Backlog" });

			await user.click(
				screen.getByRole("button", { name: "More list actions" })
			);
			const sheet = await screen.findByRole("dialog", {
				name: "List actions"
			});

			expect(sheet).toHaveTextContent("My Games");
			expect(sheet).toHaveTextContent("Backlog");
		});

		it("emits once when an item is double tapped", async () => {
			const user = userEvent.setup();
			const selected = await renderMenu();

			await user.click(
				screen.getByRole("button", { name: "More list actions" })
			);
			const sheet = await screen.findByRole("dialog", {
				name: "List actions"
			});
			await user.dblClick(
				within(sheet).getByRole("button", { name: "Edit list" })
			);

			expect(selected).toHaveBeenCalledTimes(1);
		});
	});
});
