import "@testing-library/jest-dom/vitest";

import { Component, input } from "@angular/core";
import { render, screen } from "@testing-library/angular";

import { SettingsRow } from "./settings-row";

@Component({
	imports: [SettingsRow],
	template: `
		<app-settings-row
			label="Display name"
			[hint]="hint()"
			[controlId]="controlId()"
			[labelId]="labelId()"
			[icon]="icon()"
		>
			<input id="profile-name" />
		</app-settings-row>
	`
})
class Host {
	readonly hint = input<string | null>(null);
	readonly controlId = input<string | null>(null);
	readonly labelId = input<string | null>(null);
	readonly icon = input<string | null>(null);
}

describe("SettingsRow", () => {
	it("associates the label with the control when controlId is set", async () => {
		await render(Host, { inputs: { controlId: "profile-name" } });

		expect(screen.getByLabelText("Display name")).toHaveAttribute(
			"id",
			"profile-name"
		);
	});

	it("renders a plain labelled span with labelId when there is no control", async () => {
		await render(Host, { inputs: { labelId: "row-label" } });

		const label = screen.getByText("Display name");
		expect(label.tagName).toBe("SPAN");
		expect(label).toHaveAttribute("id", "row-label");
	});

	it("shows the hint only when provided", async () => {
		const { rerender } = await render(Host);
		expect(screen.queryByText("Leave it empty")).not.toBeInTheDocument();

		await rerender({ inputs: { hint: "Leave it empty" } });

		expect(screen.getByText("Leave it empty")).toBeInTheDocument();
	});

	it("shows the icon only when provided", async () => {
		const { container, rerender } = await render(Host);
		expect(container.querySelector(".material-icons")).toBeNull();

		await rerender({ inputs: { icon: "person" } });

		expect(container.querySelector(".material-icons")).toHaveTextContent(
			"person"
		);
	});

	it("projects the control", async () => {
		await render(Host);

		expect(document.getElementById("profile-name")).toBeInTheDocument();
	});
});
