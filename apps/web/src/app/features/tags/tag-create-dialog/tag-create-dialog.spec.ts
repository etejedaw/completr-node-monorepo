import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NEVER, of, throwError } from "rxjs";

import { MoodTagsService } from "../../../core/services/mood-tags";
import { ViewportService } from "../../../core/services/viewport";
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
	it("labels the name plainly and marks the description, icon and color as optional", async () => {
		await renderDialog();

		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
		expect(screen.getAllByText("Optional")).toHaveLength(3);
		expect(
			screen.getByRole("group", { name: /^Icon/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole("group", { name: /^Color/ })
		).toBeInTheDocument();
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
			description: null,
			icon: null,
			color: null
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
			description: null,
			icon: null,
			color: null
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

	const iconGroup = () => screen.getByRole("group", { name: /^Icon/ });
	const colorGroup = () => screen.getByRole("group", { name: /^Color/ });

	it("offers the default tag icon and no color until the user picks one", async () => {
		await renderDialog();

		expect(
			within(iconGroup()).getByRole("button", { name: "Default icon" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(colorGroup()).getByRole("button", { name: "No color" })
		).toHaveAttribute("aria-pressed", "true");
	});

	it("sends the last icon and color picked after changing them quickly", async () => {
		const user = userEvent.setup();
		const { createTag } = await renderDialog();

		await user.type(screen.getByLabelText("Name"), "cozy");
		for (const name of ["Star", "Heart", "Bolt"])
			await user.click(within(iconGroup()).getByRole("button", { name }));
		for (const name of ["Pink", "Teal", "Green"])
			await user.click(
				within(colorGroup()).getByRole("button", { name })
			);
		await user.click(screen.getByRole("button", { name: "Create" }));

		expect(createTag).toHaveBeenCalledExactlyOnceWith({
			tag: "cozy",
			description: null,
			icon: "bolt",
			color: "emerald"
		});
	});

	it("sends null when the user picks an icon and then goes back to the default", async () => {
		const user = userEvent.setup();
		const { createTag } = await renderDialog();

		await user.type(screen.getByLabelText("Name"), "cozy");
		await user.click(
			within(iconGroup()).getByRole("button", { name: "Star" })
		);
		await user.click(
			within(iconGroup()).getByRole("button", { name: "Default icon" })
		);
		await user.click(
			within(colorGroup()).getByRole("button", { name: "Pink" })
		);
		await user.click(
			within(colorGroup()).getByRole("button", { name: "No color" })
		);
		await user.click(screen.getByRole("button", { name: "Create" }));

		expect(createTag).toHaveBeenCalledExactlyOnceWith({
			tag: "cozy",
			description: null,
			icon: null,
			color: null
		});
	});

	it("closes without creating anything when cancelled after picking an icon and color", async () => {
		const user = userEvent.setup();
		const { fixture, createTag } = await renderDialog();
		const closed = vi.fn();
		fixture.componentInstance.closed.subscribe(closed);

		await user.type(screen.getByLabelText("Name"), "cozy");
		await user.click(
			within(iconGroup()).getByRole("button", { name: "Star" })
		);
		await user.click(
			within(colorGroup()).getByRole("button", { name: "Pink" })
		);
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(closed).toHaveBeenCalledTimes(1);
		expect(createTag).not.toHaveBeenCalled();
	});

	it("keeps the picked icon and color when the API fails so the retry sends them again", async () => {
		const user = userEvent.setup();
		const createTag = vi
			.fn()
			.mockReturnValueOnce(
				throwError(
					() =>
						new HttpErrorResponse({
							status: 500,
							error: { title: "Server is down." }
						})
				)
			)
			.mockReturnValue(of({}));
		const { fixture } = await renderDialog(createTag);
		const created = vi.fn();
		fixture.componentInstance.created.subscribe(created);

		await user.type(screen.getByLabelText("Name"), "cozy");
		await user.click(
			within(iconGroup()).getByRole("button", { name: "Rocket" })
		);
		await user.click(
			within(colorGroup()).getByRole("button", { name: "Purple" })
		);
		await user.click(screen.getByRole("button", { name: "Create" }));

		expect(await screen.findByText("Server is down.")).toBeInTheDocument();
		expect(created).not.toHaveBeenCalled();
		expect(
			within(iconGroup()).getByRole("button", { name: "Rocket" })
		).toHaveAttribute("aria-pressed", "true");

		await user.click(screen.getByRole("button", { name: "Create" }));

		expect(createTag).toHaveBeenCalledTimes(2);
		expect(createTag).toHaveBeenLastCalledWith({
			tag: "cozy",
			description: null,
			icon: "rocket_launch",
			color: "purple"
		});
		expect(created).toHaveBeenCalledTimes(1);
	});
});
