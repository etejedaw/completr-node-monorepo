import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { AdminDataRequestRejectDialog } from "./admin-data-request-reject-dialog";

describe("AdminDataRequestRejectDialog", () => {
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
		const submitted = vi.fn();
		const cancelled = vi.fn();
		const view = await render(AdminDataRequestRejectDialog, {
			inputs,
			on: { submitted, cancelled }
		});
		const dialog = await screen.findByRole("dialog", {
			name: "Reject request?"
		});
		return { dialog, submitted, cancelled, view };
	}

	function reasonField(dialog: HTMLElement) {
		return within(dialog).getByLabelText("Reason");
	}

	function rejectButton(dialog: HTMLElement) {
		return within(dialog).getByRole("button", {
			name: /^(Reject request|Rejecting…)$/
		});
	}

	it("refuses an empty reason and explains why", async () => {
		const user = userEvent.setup();
		const { dialog, submitted } = await renderDialog();

		await user.click(rejectButton(dialog));

		expect(submitted).not.toHaveBeenCalled();
		expect(
			within(dialog).getByText("Explain why the request is rejected.")
		).toBeInTheDocument();
	});

	it("refuses a reason made only of whitespace", async () => {
		const user = userEvent.setup();
		const { dialog, submitted } = await renderDialog();

		await user.type(reasonField(dialog), "   {Enter}  ");
		await user.click(rejectButton(dialog));

		expect(submitted).not.toHaveBeenCalled();
		expect(
			within(dialog).getByText("Explain why the request is rejected.")
		).toBeInTheDocument();
	});

	it("caps a pasted wall of text at 500 characters", async () => {
		const user = userEvent.setup();
		const { dialog, submitted } = await renderDialog();

		await user.click(reasonField(dialog));
		await user.paste("x".repeat(900));
		await user.click(rejectButton(dialog));

		expect(submitted).toHaveBeenCalledExactlyOnceWith("x".repeat(500));
	});

	it("sends the trimmed reason and keeps markup as plain text", async () => {
		const user = userEvent.setup();
		const { dialog, submitted } = await renderDialog();

		await user.click(reasonField(dialog));
		await user.paste("  <b>Not the owner</b> ✨  ");
		await user.click(rejectButton(dialog));

		expect(submitted).toHaveBeenCalledExactlyOnceWith(
			"<b>Not the owner</b> ✨"
		);
		expect(dialog.querySelector("b")).toBeNull();
	});

	it("submits once with Enter in the form and a repeated click while the parent is slow", async () => {
		const user = userEvent.setup();
		const { dialog, submitted, view } = await renderDialog();

		await user.type(reasonField(dialog), "No proof");
		await user.click(rejectButton(dialog));
		view.fixture.componentRef.setInput("busy", true);
		await view.fixture.whenStable();
		await user.dblClick(rejectButton(dialog));

		expect(submitted).toHaveBeenCalledTimes(1);
		expect(rejectButton(dialog)).toBeDisabled();
		expect(rejectButton(dialog)).toHaveTextContent("Rejecting…");
	});

	it("blocks Cancel and Escape while busy", async () => {
		const user = userEvent.setup();
		const { dialog, cancelled, view } = await renderDialog();

		view.fixture.componentRef.setInput("busy", true);
		await view.fixture.whenStable();
		await user.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		await user.keyboard("{Escape}");

		expect(cancelled).not.toHaveBeenCalled();
	});

	it("re-enables the form and keeps the typed reason after an API error", async () => {
		const user = userEvent.setup();
		const { dialog, submitted, view } = await renderDialog();

		await user.type(reasonField(dialog), "No proof");
		await user.click(rejectButton(dialog));
		view.fixture.componentRef.setInput("busy", true);
		await view.fixture.whenStable();
		view.fixture.componentRef.setInput("busy", false);
		await view.fixture.whenStable();

		expect(reasonField(dialog)).toHaveValue("No proof");
		expect(rejectButton(dialog)).toBeEnabled();
		await user.click(rejectButton(dialog));
		expect(submitted).toHaveBeenCalledTimes(2);
	});

	it("cancels half way through typing without sending anything", async () => {
		const user = userEvent.setup();
		const { dialog, submitted, cancelled } = await renderDialog();

		await user.type(reasonField(dialog), "Half a rea");
		await user.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);

		expect(cancelled).toHaveBeenCalledTimes(1);
		expect(submitted).not.toHaveBeenCalled();
	});
});
