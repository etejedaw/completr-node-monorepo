import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { SettingsSaveBar } from "./settings-save-bar";

describe("SettingsSaveBar", () => {
	it("renders nothing while it is not visible", async () => {
		await render(SettingsSaveBar);

		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
	});

	it("announces unsaved changes and enables both actions", async () => {
		await render(SettingsSaveBar, { inputs: { visible: true } });

		expect(
			screen.getByRole("region", { name: "Unsaved changes" })
		).toBeInTheDocument();
		expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeEnabled();
	});

	it("asks to fix the fields and blocks saving when invalid", async () => {
		await render(SettingsSaveBar, {
			inputs: { visible: true, invalid: true }
		});

		expect(
			screen.getByText("Fix the highlighted fields")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
	});

	it("disables both actions and shows progress while saving", async () => {
		await render(SettingsSaveBar, {
			inputs: { visible: true, saving: true }
		});

		expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
	});

	it("emits discarded and saved from their buttons", async () => {
		const user = userEvent.setup();
		const discarded = vi.fn();
		const saved = vi.fn();
		await render(SettingsSaveBar, {
			inputs: { visible: true },
			on: { discarded, saved }
		});

		await user.click(screen.getByRole("button", { name: "Discard" }));
		expect(discarded).toHaveBeenCalledTimes(1);
		expect(saved).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Save changes" }));
		expect(saved).toHaveBeenCalledTimes(1);
	});
});
