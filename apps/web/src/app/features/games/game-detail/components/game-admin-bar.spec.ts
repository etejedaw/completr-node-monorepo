import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { GameAdminBar } from "./game-admin-bar";
import { type AdminActionsState } from "./game-admin-bar.model";

const idleState: AdminActionsState = {
	confirmDeactivate: false,
	confirmDelete: false,
	editor: false,
	deactivating: false,
	deleting: false
};

describe("GameAdminBar", () => {
	async function renderBar(
		state: Partial<AdminActionsState> = {},
		isAdmin = true
	) {
		const events = {
			state: vi.fn<(patch: Partial<AdminActionsState>) => void>(),
			deactivate: vi.fn(),
			remove: vi.fn()
		};
		const view = await render(GameAdminBar, {
			inputs: {
				state: { ...idleState, ...state },
				isAdmin,
				gameTitle: "Hades"
			},
			on: {
				stateChanged: events.state,
				deactivateConfirmed: events.deactivate,
				deleteConfirmed: events.remove
			}
		});
		const setState = async (next: Partial<AdminActionsState>) => {
			view.fixture.componentRef.setInput("state", {
				...idleState,
				...next
			});
			view.fixture.detectChanges();
			await view.fixture.whenStable();
		};
		return { events, setState, element: view.container as HTMLElement };
	}

	const menuTrigger = () =>
		screen.getByRole("button", { name: "More admin actions" });

	async function chooseFromMenu(name: string) {
		await userEvent.click(menuTrigger());
		await userEvent.click(await screen.findByRole("menuitem", { name }));
	}

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("labels the bar as Admin for admins", async () => {
		const { element } = await renderBar();
		expect(element).toHaveTextContent("Admin");
	});

	it("labels the bar as Moderator for moderators", async () => {
		const { element } = await renderBar({}, false);
		expect(element).toHaveTextContent("Moderator");
	});

	it("only offers the editor to moderators", async () => {
		await renderBar({}, false);

		expect(
			screen.getByRole("button", { name: "Edit game" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "More admin actions" })
		).toBeNull();
	});

	it("keeps Edit game visible and the destructive actions in the menu", async () => {
		await renderBar();

		expect(
			screen.getByRole("button", { name: "Edit game" })
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Deactivate" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();

		await userEvent.click(menuTrigger());

		expect(
			await screen.findByRole("menuitem", { name: "Deactivate" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: "Delete" })
		).toBeInTheDocument();
	});

	it("toggles the editor through stateChanged and reports whether it is open", async () => {
		const { events, setState } = await renderBar();
		const edit = screen.getByRole("button", { name: "Edit game" });
		expect(edit).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(edit);
		expect(events.state).toHaveBeenCalledWith({ editor: true });

		await setState({ editor: true });
		const close = screen.getByRole("button", { name: "Close editor" });
		expect(close).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(close);
		expect(events.state).toHaveBeenCalledWith({ editor: false });
	});

	it("asks for confirmation before deactivating", async () => {
		const { events } = await renderBar();

		await chooseFromMenu("Deactivate");

		expect(events.state).toHaveBeenCalledWith({
			confirmDeactivate: true,
			confirmDelete: false
		});
		expect(events.deactivate).not.toHaveBeenCalled();
	});

	it("asks for confirmation before deleting", async () => {
		const { events } = await renderBar();

		await chooseFromMenu("Delete");

		expect(events.state).toHaveBeenCalledWith({
			confirmDelete: true,
			confirmDeactivate: false
		});
		expect(events.remove).not.toHaveBeenCalled();
	});

	it("confirms a deactivation in a dialog", async () => {
		const { events } = await renderBar({ confirmDeactivate: true });

		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Hades?"
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Deactivate" })
		);

		expect(events.deactivate).toHaveBeenCalledTimes(1);
	});

	it("cancels a deactivation with the Cancel button or Escape", async () => {
		const { events } = await renderBar({ confirmDeactivate: true });
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Hades?"
		});

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		expect(events.state).toHaveBeenCalledWith({
			confirmDeactivate: false
		});

		events.state.mockClear();
		await userEvent.keyboard("{Escape}");
		expect(events.state).toHaveBeenCalledWith({
			confirmDeactivate: false
		});
		expect(events.deactivate).not.toHaveBeenCalled();
	});

	it("confirms or cancels a deletion in a dialog", async () => {
		const { events } = await renderBar({ confirmDelete: true });
		const dialog = await screen.findByRole("dialog", {
			name: "Permanently delete Hades?"
		});

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Delete forever" })
		);
		expect(events.remove).toHaveBeenCalledTimes(1);

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		expect(events.state).toHaveBeenCalledWith({ confirmDelete: false });
	});

	it("disables the dialog and ignores Escape while deactivating", async () => {
		const { events } = await renderBar({
			confirmDeactivate: true,
			deactivating: true
		});
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Hades?"
		});

		expect(
			within(dialog).getByRole("button", { name: "Deactivating..." })
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Cancel" })
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");

		expect(events.state).not.toHaveBeenCalled();
		expect(menuTrigger()).toHaveAttribute("aria-busy", "true");
	});

	it("disables the confirm button while deleting", async () => {
		await renderBar({ confirmDelete: true, deleting: true });
		const dialog = await screen.findByRole("dialog", {
			name: "Permanently delete Hades?"
		});

		expect(
			within(dialog).getByRole("button", { name: "Deleting..." })
		).toBeDisabled();
	});

	it("sends a single confirmation when the confirm button is double clicked", async () => {
		const { events, setState } = await renderBar({ confirmDelete: true });
		const dialog = await screen.findByRole("dialog", {
			name: "Permanently delete Hades?"
		});
		events.remove.mockImplementation(() =>
			setState({ confirmDelete: true, deleting: true })
		);

		await userEvent.dblClick(
			within(dialog).getByRole("button", { name: "Delete forever" })
		);

		expect(events.remove).toHaveBeenCalledTimes(1);
	});

	it("does not open a second confirmation while an action is running", async () => {
		const { events } = await renderBar({ deleting: true });

		await userEvent.click(menuTrigger());
		const deactivate = await screen.findByRole("menuitem", {
			name: "Deactivate"
		});
		await userEvent.click(deactivate);

		expect(events.state).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
