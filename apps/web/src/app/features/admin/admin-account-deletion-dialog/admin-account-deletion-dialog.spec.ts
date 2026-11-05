import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { AdminAccountDeletionDialog } from "./admin-account-deletion-dialog";

describe("AdminAccountDeletionDialog", () => {
	beforeEach(() => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => vi.unstubAllGlobals());

	async function renderDialog(inputs: Record<string, unknown> = {}) {
		const confirmed = vi.fn();
		const cancelled = vi.fn();
		await render(AdminAccountDeletionDialog, {
			inputs: { username: "bob", ...inputs },
			on: { confirmed, cancelled }
		});
		const dialog = await screen.findByRole("dialog", {
			name: "Delete account?"
		});
		return { dialog, confirmed, cancelled };
	}

	function deleteButton(dialog: HTMLElement) {
		return within(dialog).getByRole("button", { name: "Delete account" });
	}

	it("warns that the deletion is irreversible", async () => {
		const { dialog } = await renderDialog();

		expect(within(dialog).getByText(/can't be undone/)).toBeInTheDocument();
	});

	it("enables the deletion only once the exact username is typed", async () => {
		const user = userEvent.setup();
		const { dialog, confirmed } = await renderDialog();
		const field = within(dialog).getByLabelText("Type bob to confirm");

		expect(deleteButton(dialog)).toBeDisabled();
		await user.type(field, "Bob");
		expect(deleteButton(dialog)).toBeDisabled();
		await user.clear(field);
		await user.type(field, "bob");
		expect(deleteButton(dialog)).toBeEnabled();

		await user.click(deleteButton(dialog));
		expect(confirmed).toHaveBeenCalledTimes(1);
	});

	it("confirms with Enter after typing the username", async () => {
		const user = userEvent.setup();
		const { dialog, confirmed } = await renderDialog();

		await user.type(
			within(dialog).getByLabelText("Type bob to confirm"),
			"bob{Enter}"
		);

		expect(confirmed).toHaveBeenCalledTimes(1);
	});

	it("does not confirm with Enter before the username matches", async () => {
		const user = userEvent.setup();
		const { dialog, confirmed } = await renderDialog();

		await user.type(
			within(dialog).getByLabelText("Type bob to confirm"),
			"bo{Enter}"
		);

		expect(confirmed).not.toHaveBeenCalled();
	});

	it("emits cancelled from Cancel", async () => {
		const user = userEvent.setup();
		const { dialog, cancelled } = await renderDialog();

		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		expect(cancelled).toHaveBeenCalled();
	});

	it("locks both buttons while deleting", async () => {
		const { dialog } = await renderDialog({ busy: true });

		expect(
			within(dialog).getByRole("button", { name: "Deleting…" })
		).toBeDisabled();
		expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
	});
});
