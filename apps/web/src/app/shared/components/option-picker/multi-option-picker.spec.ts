import "@testing-library/jest-dom/vitest";

import { Component, signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { MultiOptionPicker } from "./multi-option-picker";
import { type PickerOption } from "./option-picker";

const platforms: PickerOption[] = [
	{ value: "pc", label: "PC", shortLabel: "PC" },
	{ value: "ps2", label: "PlayStation 2", shortLabel: "PS2" },
	{ value: "ps3", label: "PlayStation 3", shortLabel: "PS3" },
	{ value: "switch", label: "Nintendo Switch", shortLabel: "NSW" },
	{ value: "xbox", label: "Xbox 360", shortLabel: "X360" }
];

const manyPlatforms: PickerOption[] = [
	...platforms,
	{ value: "wii", label: "Wii", shortLabel: "Wii" },
	{ value: "gba", label: "Game Boy Advance", shortLabel: "GBA" },
	{ value: "ds", label: "Nintendo DS", shortLabel: "NDS" },
	{ value: "psp", label: "PlayStation Portable", shortLabel: "PSP" }
];

@Component({
	imports: [MultiOptionPicker],
	template: `<app-multi-option-picker
		label="Platform"
		heading="Filter by platform"
		placeholder="All platforms"
		noun="platforms"
		searchLabel="Search platforms"
		[options]="options()"
		[(values)]="values"
	/>`
})
class Host {
	readonly options = signal<PickerOption[]>(platforms);
	readonly values = signal<readonly string[]>([]);
}

describe("MultiOptionPicker", () => {
	async function renderPicker(
		initial: string[] = [],
		options: PickerOption[] = platforms,
		mobile = false
	) {
		const result = await render(Host, {
			providers: [
				{
					provide: ViewportService,
					useValue: { isMobile: signal(mobile) }
				}
			]
		});
		result.fixture.componentInstance.options.set(options);
		result.fixture.componentInstance.values.set(initial);
		result.fixture.detectChanges();
		return {
			user: userEvent.setup(),
			host: result.fixture.componentInstance
		};
	}

	function trigger() {
		return screen.getByRole("button", { name: /^Platform:/ });
	}

	function option(name: string) {
		return screen.getByRole("option", { name });
	}

	describe("summary", () => {
		it("shows the placeholder when nothing is selected", async () => {
			await renderPicker();

			expect(trigger()).toHaveAccessibleName("Platform: All platforms");
		});

		it("shows the full name of a single selection", async () => {
			await renderPicker(["ps2"]);

			expect(trigger()).toHaveAccessibleName("Platform: PlayStation 2");
		});

		it("lists the short names of two or three selections", async () => {
			await renderPicker(["ps2", "ps3"]);
			expect(trigger()).toHaveAccessibleName("Platform: PS2, PS3");
		});

		it("lists them in option order, not selection order", async () => {
			await renderPicker(["ps3", "pc", "ps2"]);

			expect(trigger()).toHaveTextContent("PC, PS2, PS3");
		});

		it("counts four or more selections", async () => {
			await renderPicker(["pc", "ps2", "ps3", "switch"]);

			expect(trigger()).toHaveAccessibleName("Platform: 4 platforms");
		});

		it("counts selections that are not in the options yet", async () => {
			await renderPicker(["ps2"], []);

			expect(trigger()).toHaveAccessibleName("Platform: 1 platforms");
		});
	});

	describe("popover", () => {
		it("lists every option as unchecked checkboxes of a multiselectable listbox", async () => {
			const { user } = await renderPicker();

			await user.click(trigger());

			const list = screen.getByRole("listbox", {
				name: "Filter by platform"
			});
			expect(list).toHaveAttribute("aria-multiselectable", "true");
			expect(within(list).getAllByRole("option")).toHaveLength(5);
			expect(option("PlayStation 2")).toHaveAttribute(
				"aria-selected",
				"false"
			);
		});

		it("selects several options without closing and reports them in option order", async () => {
			const { user, host } = await renderPicker();
			await user.click(trigger());

			await user.click(option("PlayStation 3"));
			await user.click(option("PlayStation 2"));

			expect(host.values()).toEqual(["ps2", "ps3"]);
			expect(option("PlayStation 2")).toHaveAttribute(
				"aria-selected",
				"true"
			);
			expect(screen.getByRole("listbox")).toBeInTheDocument();
			expect(trigger()).toHaveAccessibleName("Platform: PS2, PS3");
		});

		it("unselects an option that is already selected", async () => {
			const { user, host } = await renderPicker(["ps2", "ps3"]);
			await user.click(trigger());

			await user.click(option("PlayStation 2"));

			expect(host.values()).toEqual(["ps3"]);
		});

		it("clears the selection with Clear and disables it when empty", async () => {
			const { user, host } = await renderPicker(["ps2", "ps3"]);
			await user.click(trigger());

			await user.click(screen.getByRole("button", { name: "Clear" }));

			expect(host.values()).toEqual([]);
			expect(trigger()).toHaveAccessibleName("Platform: All platforms");
			expect(
				screen.getByRole("button", { name: "Clear" })
			).toBeDisabled();
		});

		it("selects with the keyboard from the listbox", async () => {
			const { user, host } = await renderPicker();
			await user.click(trigger());
			screen.getByRole("listbox").focus();

			await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

			expect(host.values()).toHaveLength(1);
		});

		it("closes with Escape and keeps the selection", async () => {
			const { user, host } = await renderPicker(["pc"]);
			await user.click(trigger());

			await user.keyboard("{Escape}");

			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			expect(host.values()).toEqual(["pc"]);
		});
	});

	describe("search", () => {
		it("hides the search box for short lists", async () => {
			const { user } = await renderPicker();

			await user.click(trigger());

			expect(
				screen.queryByRole("searchbox", { name: "Search platforms" })
			).not.toBeInTheDocument();
		});

		it("filters long lists by name or short name and keeps the hidden selection", async () => {
			const { user, host } = await renderPicker(["pc"], manyPlatforms);
			await user.click(trigger());

			await user.type(
				screen.getByRole("searchbox", { name: "Search platforms" }),
				"play"
			);

			expect(
				screen.getAllByRole("option").map(item => item.textContent)
			).toEqual([
				expect.stringContaining("PlayStation 2"),
				expect.stringContaining("PlayStation 3"),
				expect.stringContaining("PlayStation Portable")
			]);

			await user.click(option("PlayStation 3"));
			expect(host.values()).toEqual(["pc", "ps3"]);

			await user.clear(
				screen.getByRole("searchbox", { name: "Search platforms" })
			);
			await user.type(
				screen.getByRole("searchbox", { name: "Search platforms" }),
				"nsw"
			);
			expect(screen.getAllByRole("option")).toHaveLength(1);
		});

		it("says when nothing matches", async () => {
			const { user } = await renderPicker([], manyPlatforms);
			await user.click(trigger());

			await user.type(
				screen.getByRole("searchbox", { name: "Search platforms" }),
				"zzz"
			);

			expect(screen.getByText("No matches")).toBeInTheDocument();
		});

		it("moves from the search box into the list with the down arrow", async () => {
			const { user } = await renderPicker([], manyPlatforms);
			await user.click(trigger());
			const search = screen.getByRole("searchbox", {
				name: "Search platforms"
			});
			search.focus();

			await user.keyboard("{ArrowDown}");

			expect(screen.getByRole("listbox")).toHaveFocus();
		});
	});

	describe("mobile sheet", () => {
		it("opens a bottom sheet with the same options and closes it with Done", async () => {
			const { user, host } = await renderPicker([], platforms, true);

			await user.click(trigger());
			const sheet = screen.getByRole("dialog", {
				name: "Filter by platform"
			});
			await user.click(within(sheet).getByRole("option", { name: "PC" }));
			await user.click(
				within(sheet).getByRole("option", { name: "Xbox 360" })
			);

			expect(host.values()).toEqual(["pc", "xbox"]);

			await user.click(
				within(sheet).getByRole("button", { name: "Done" })
			);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(trigger()).toHaveAccessibleName("Platform: PC, X360");
		});
	});
});
