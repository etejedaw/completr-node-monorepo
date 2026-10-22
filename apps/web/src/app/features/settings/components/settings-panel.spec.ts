import "@testing-library/jest-dom/vitest";

import { Component } from "@angular/core";
import { render, screen } from "@testing-library/angular";

import { SettingsPanel } from "./settings-panel";

@Component({
	imports: [SettingsPanel],
	template: `
		<app-settings-panel
			heading="Theme"
			headingId="theme-heading"
			[description]="description"
		>
			<button panelActions>Reset</button>
			<p>Panel body</p>
		</app-settings-panel>
	`
})
class Host {
	description: string | null = null;
}

describe("SettingsPanel", () => {
	it("labels the section with its heading", async () => {
		await render(Host);

		const region = screen.getByRole("region", { name: "Theme" });
		expect(region).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Theme" })).toHaveAttribute(
			"id",
			"theme-heading"
		);
	});

	it("projects the body and the header actions", async () => {
		await render(Host);

		expect(screen.getByText("Panel body")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Reset" })
		).toBeInTheDocument();
	});

	it("omits the description when it is null", async () => {
		const { container } = await render(Host);

		expect(container.querySelectorAll("header p")).toHaveLength(0);
	});

	it("renders the description when provided", async () => {
		await render(Host, {
			componentProperties: { description: "Pick one" }
		});

		expect(screen.getByText("Pick one")).toBeInTheDocument();
	});
});
