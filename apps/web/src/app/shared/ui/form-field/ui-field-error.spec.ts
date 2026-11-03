import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { UiFieldError } from "./ui-field-error";

@Component({
	imports: [UiFieldError],
	template: `
		<label for="name">Name</label>
		<input
			id="name"
			[attr.aria-invalid]="message() ? true : null"
			[attr.aria-describedby]="message() ? 'name-error' : null"
			(blur)="validate()"
			(input)="draft.set($any($event.target).value)"
		/>
		@if (message(); as text) {
			<ui-field-error id="name-error" [announce]="announce()">{{
				text
			}}</ui-field-error>
		}
	`
})
class Host {
	readonly draft = signal("");
	readonly message = signal<string | null>(null);
	readonly announce = signal(false);

	validate() {
		this.message.set(this.draft().trim() ? null : "Name is required.");
	}
}

describe("UiFieldError", () => {
	async function setup() {
		const result = await render(Host);
		return {
			user: userEvent.setup(),
			host: result.fixture.componentInstance,
			fixture: result.fixture
		};
	}

	it("describes the invalid field with its message", async () => {
		const { user } = await setup();

		await user.click(screen.getByLabelText("Name"));
		await user.tab();

		const field = screen.getByRole("textbox", { name: "Name" });
		expect(field).toHaveAttribute("aria-invalid", "true");
		expect(field).toHaveAccessibleDescription("Name is required.");
	});

	it("hides the icon from assistive technology", async () => {
		const { host, fixture } = await setup();
		host.message.set("Name is required.");
		fixture.detectChanges();

		const error = document.getElementById("name-error") as HTMLElement;
		expect(error.querySelector(".material-icons")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(error).toHaveTextContent("error_outline");
		expect(error).not.toHaveAttribute("role");
	});

	it("announces itself only when asked to", async () => {
		const { host, fixture } = await setup();
		host.announce.set(true);
		host.message.set("Could not save.");
		fixture.detectChanges();

		expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
	});

	it("disappears when the input is fixed after blurring empty and garbage", async () => {
		const { user } = await setup();
		const field = screen.getByLabelText("Name");

		await user.click(field);
		await user.type(field, "   ");
		await user.tab();
		expect(screen.getByText("Name is required.")).toBeInTheDocument();

		await user.clear(field);
		await user.type(field, "Ada");
		await user.tab();
		expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
		expect(field).not.toHaveAttribute("aria-describedby");
	});
});
