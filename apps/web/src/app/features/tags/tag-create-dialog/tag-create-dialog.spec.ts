import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NEVER, of } from "rxjs";

import { ViewportService } from "../../../core/services/viewport";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { TagCreateDialog } from "./tag-create-dialog";

async function renderDialog(createTag = vi.fn().mockReturnValue(of({}))) {
	const result = await render(TagCreateDialog, {
		providers: [
			{ provide: MoodTagsService, useValue: { createTag } },
			{ provide: ViewportService, useValue: { isMobile: signal(false) } }
		]
	});
	return { ...result, createTag };
}

describe("TagCreateDialog", () => {
	it("labels the name plainly and marks only the description as optional", async () => {
		await renderDialog();

		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
		expect(screen.getByText("Optional")).toBeInTheDocument();
		expect(
			screen.getByRole("dialog", { name: "New tag" })
		).not.toHaveTextContent("*");
	});

	it("rejects a blank name made of spaces without calling the API", async () => {
		const typist = userEvent.setup();
		const { createTag } = await renderDialog();

		await typist.type(screen.getByLabelText("Name"), "     ");
		await typist.click(screen.getByRole("button", { name: "Create" }));

		expect(createTag).not.toHaveBeenCalled();
		expect(screen.getByText("Give the tag a name.")).toBeInTheDocument();
	});

	it("sends the trimmed tag and a null description when it is left empty", async () => {
		const typist = userEvent.setup();
		const { createTag } = await renderDialog();

		await typist.type(screen.getByLabelText("Name"), "  relaxing  ");
		await typist.click(screen.getByRole("button", { name: "Create" }));

		expect(createTag).toHaveBeenCalledWith({
			tag: "relaxing",
			description: null
		});
	});

	it("submits once when Create is clicked repeatedly while the request is pending", async () => {
		const typist = userEvent.setup();
		const { createTag } = await renderDialog(
			vi.fn().mockReturnValue(NEVER)
		);

		await typist.type(screen.getByLabelText("Name"), "cozy");
		const create = screen.getByRole("button", { name: "Create" });
		await typist.dblClick(create);
		await typist.keyboard("{Enter}");

		expect(createTag).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("button", { name: "Creating…" })
		).toBeDisabled();
	});

	it("caps a pasted name at the limit instead of sending an oversized tag", async () => {
		const typist = userEvent.setup();
		const { createTag } = await renderDialog();

		await typist.click(screen.getByLabelText("Name"));
		await typist.paste("x".repeat(60));

		expect(screen.getByLabelText("Name")).toHaveValue("x".repeat(40));
		await typist.click(screen.getByRole("button", { name: "Create" }));
		expect(createTag).toHaveBeenCalledWith({
			tag: "x".repeat(40),
			description: null
		});
	});

	it("emits closed when Cancel is pressed and ignores Escape while submitting", async () => {
		const typist = userEvent.setup();
		const { fixture } = await renderDialog(vi.fn().mockReturnValue(NEVER));
		const closed = vi.fn();
		fixture.componentInstance.closed.subscribe(closed);

		await typist.type(screen.getByLabelText("Name"), "cozy");
		await typist.click(screen.getByRole("button", { name: "Create" }));
		await typist.keyboard("{Escape}");

		expect(closed).not.toHaveBeenCalled();
	});
});
