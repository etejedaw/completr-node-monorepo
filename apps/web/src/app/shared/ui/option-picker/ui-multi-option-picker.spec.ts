import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { UiMultiOptionPicker } from "./ui-multi-option-picker";
import { UiOptionPicker } from "./ui-option-picker";
import { type UiPickerOption } from "./ui-option-picker.model";

const platforms: UiPickerOption[] = [
	{ value: "pc", label: "PC", shortLabel: "PC" },
	{ value: "ps2", label: "PlayStation 2", shortLabel: "PS2" },
	{ value: "ps3", label: "PlayStation 3", shortLabel: "PS3" },
	{ value: "switch", label: "Nintendo Switch", shortLabel: "NSW" },
	{ value: "xbox", label: "Xbox 360", shortLabel: "X360" }
];

const manyPlatforms: UiPickerOption[] = [
	...platforms,
	{ value: "wii", label: "Wii", shortLabel: "Wii" },
	{ value: "gba", label: "Game Boy Advance", shortLabel: "GBA" },
	{ value: "ds", label: "Nintendo DS", shortLabel: "NDS" },
	{ value: "psp", label: "PlayStation Portable", shortLabel: "PSP" }
];

@Component({
	imports: [UiMultiOptionPicker],
	template: `<ui-multi-option-picker
		label="Platform"
		heading="Filter by platform"
		placeholder="All platforms"
		noun="platforms"
		nounSingular="platform"
		searchLabel="Search platforms"
		[options]="options()"
		[(values)]="values"
	/>`
})
class Host {
	readonly options = signal<UiPickerOption[]>(platforms);
	readonly values = signal<readonly string[]>([]);
}

const tags: UiPickerOption[] = [
	{ value: "cozy", label: "cozy", count: 12 },
	{ value: "short", label: "short", count: 3 },
	{ value: "co-op", label: "co-op", count: 1 }
];

@Component({
	imports: [UiMultiOptionPicker, UiOptionPicker],
	template: `<ui-multi-option-picker
			variant="compact"
			[size]="size()"
			label="Tags"
			heading="Filter by your tags"
			placeholder="Any"
			placeholderIcon="sell"
			noun="tags"
			[options]="options()"
			[(values)]="values"
		/>
		<ui-option-picker
			variant="compact"
			[size]="size()"
			label="View"
			heading="Saved views"
			placeholderIcon="bookmark_border"
			[options]="views"
			[(value)]="view"
		/>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class CompactHost {
	readonly size = signal<"sm" | "md">("md");
	readonly options = signal<UiPickerOption[]>(tags);
	readonly values = signal<readonly string[]>([]);
	readonly views: UiPickerOption[] = [
		{ value: "", label: "None" },
		{ value: "v1", label: "Short ones" }
	];
	readonly view = signal("");
}

describe("UiMultiOptionPicker", () => {
	async function renderPicker(
		initial: string[] = [],
		options: UiPickerOption[] = platforms,
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
		const user = userEvent.setup();
		return {
			user,
			host: result.fixture.componentInstance,
			openPopover: async () => {
				await user.click(trigger());
				await result.fixture.whenStable();
			}
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

			expect(trigger()).toHaveAccessibleName("Platform: 1 platform");
		});

		it("uses the singular noun for one selection and the plural for more", async () => {
			const { user, openPopover } = await renderPicker(["ps2", "ps3"]);
			await openPopover();
			const header = () =>
				document
					.querySelector<HTMLElement>("p[aria-live]")
					?.textContent?.trim();
			expect(header()).toBe("2 platforms");

			await user.click(option("PlayStation 3"));

			expect(header()).toBe("1 platform");
			expect(trigger()).toHaveAccessibleName("Platform: PlayStation 2");
		});
	});

	describe("option icons", () => {
		it("shows each option's icon in its color and keeps the plain label as the name", async () => {
			const { openPopover } = await renderPicker(
				[],
				[
					{
						value: "cozy",
						label: "cozy",
						icon: "bolt",
						iconColor: "var(--color-view-sky)"
					},
					{ value: "short", label: "short" }
				]
			);
			await openPopover();

			const cozy = option("cozy");
			const icon = within(cozy).getByText("bolt");
			expect(icon).toHaveAttribute("aria-hidden", "true");
			expect(icon.style.color).toBe("var(--color-view-sky)");
			expect(within(option("short")).queryByText("bolt")).toBeNull();
		});
	});

	describe("popover", () => {
		it("lists every option as unchecked checkboxes of a multiselectable listbox", async () => {
			const { openPopover } = await renderPicker();

			await openPopover();

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
			const { user, host, openPopover } = await renderPicker();
			await openPopover();

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
			const { user, host, openPopover } = await renderPicker([
				"ps2",
				"ps3"
			]);
			await openPopover();

			await user.click(option("PlayStation 2"));

			expect(host.values()).toEqual(["ps3"]);
		});

		it("clears the selection with Clear and disables it when empty", async () => {
			const { user, host, openPopover } = await renderPicker([
				"ps2",
				"ps3"
			]);
			await openPopover();

			await user.click(screen.getByRole("button", { name: "Clear" }));

			expect(host.values()).toEqual([]);
			expect(trigger()).toHaveAccessibleName("Platform: All platforms");
			expect(
				screen.getByRole("button", { name: "Clear" })
			).toBeDisabled();
		});

		it("selects with the keyboard from the listbox", async () => {
			const { user, host, openPopover } = await renderPicker();
			await openPopover();
			screen.getByRole("listbox").focus();

			await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

			expect(host.values()).toHaveLength(1);
		});

		it("closes with Escape and keeps the selection", async () => {
			const { user, host, openPopover } = await renderPicker(["pc"]);
			await openPopover();

			await user.keyboard("{Escape}");

			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
			expect(host.values()).toEqual(["pc"]);
		});
	});

	describe("search", () => {
		it("hides the search box for short lists", async () => {
			const { openPopover } = await renderPicker();

			await openPopover();

			expect(
				screen.queryByRole("searchbox", { name: "Search platforms" })
			).not.toBeInTheDocument();
		});

		it("filters long lists by name or short name and keeps the hidden selection", async () => {
			const { user, host, openPopover } = await renderPicker(
				["pc"],
				manyPlatforms
			);
			await openPopover();

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
			const { user, openPopover } = await renderPicker([], manyPlatforms);
			await openPopover();

			await user.type(
				screen.getByRole("searchbox", { name: "Search platforms" }),
				"zzz"
			);

			expect(screen.getByText("No matches")).toBeInTheDocument();
		});

		it("moves from the search box into the list with the down arrow", async () => {
			const { user, openPopover } = await renderPicker([], manyPlatforms);
			await openPopover();
			const search = screen.getByRole("searchbox", {
				name: "Search platforms"
			});
			search.focus();

			await user.keyboard("{ArrowDown}");

			expect(screen.getByRole("listbox")).toHaveFocus();
		});
	});

	describe("compact variant", () => {
		async function renderCompact(mobile = false) {
			const result = await render(CompactHost, {
				providers: [
					{
						provide: ViewportService,
						useValue: { isMobile: signal(mobile) }
					}
				]
			});
			return {
				user: userEvent.setup(),
				fixture: result.fixture,
				host: result.fixture.componentInstance
			};
		}

		function tagsTrigger() {
			return screen.getByRole("button", { name: /^Tags:/ });
		}

		function viewTrigger() {
			return screen.getByRole("button", { name: /^View:/ });
		}

		function lookOf(button: HTMLElement) {
			return [...button.classList]
				.filter(name => !name.startsWith("aria-invalid:"))
				.sort();
		}

		function iconOf(button: HTMLElement) {
			return button.querySelector(".material-icons")!;
		}

		it("uses exactly the compact trigger of the single picker when nothing is selected", async () => {
			await renderCompact();

			expect(lookOf(tagsTrigger())).toEqual(lookOf(viewTrigger()));
			expect(tagsTrigger()).toHaveAccessibleName("Tags: Any");
			expect(tagsTrigger()).toHaveTextContent(/sell\s*Tags\s*Any/);
			expect(iconOf(tagsTrigger()).className).toBe(
				iconOf(viewTrigger()).className
			);
			expect(tagsTrigger().className).toContain("border-line");
			expect(tagsTrigger().querySelector("[uiEyebrow]")).toBeNull();
		});

		it("matches the active compact trigger once something is selected", async () => {
			const { host, fixture } = await renderCompact();

			host.values.set(["short"]);
			host.view.set("v1");
			fixture.detectChanges();

			expect(lookOf(tagsTrigger())).toEqual(lookOf(viewTrigger()));
			expect(tagsTrigger().className).toContain("border-brand");
			expect(tagsTrigger()).toHaveAccessibleName("Tags: short");
		});

		it("follows the size of the single picker", async () => {
			const { host, fixture } = await renderCompact();

			expect(tagsTrigger().className).toContain("h-10");
			host.size.set("sm");
			fixture.detectChanges();

			expect(tagsTrigger().className).toContain("h-9");
			expect(lookOf(tagsTrigger())).toEqual(lookOf(viewTrigger()));
		});

		it("shows how many games use each option next to its label", async () => {
			const { user, fixture } = await renderCompact();

			await user.click(tagsTrigger());
			await fixture.whenStable();

			const counts = screen
				.getAllByRole("option")
				.map(option => option.textContent?.match(/\d+/)?.[0]);
			expect(counts).toEqual(["12", "3", "1"]);
		});

		it("survives opening and closing over and over without changing the selection", async () => {
			const { user, fixture, host } = await renderCompact();

			for (let round = 0; round < 3; round++) {
				await user.click(tagsTrigger());
				await fixture.whenStable();
				await user.keyboard("{Escape}");
			}
			await user.dblClick(tagsTrigger());
			await user.keyboard("{Escape}");

			expect(host.values()).toEqual([]);
			expect(tagsTrigger()).toHaveAccessibleName("Tags: Any");
		});

		it("ends with the last state after a rapid select, double click and clear", async () => {
			const { user, fixture, host } = await renderCompact();
			await user.click(tagsTrigger());
			await fixture.whenStable();

			await user.click(screen.getByRole("option", { name: /^cozy/ }));
			await user.dblClick(screen.getByRole("option", { name: /^short/ }));
			await user.click(screen.getByRole("button", { name: "Clear" }));
			await user.click(screen.getByRole("option", { name: /^co-op/ }));
			await user.click(screen.getByRole("option", { name: /^cozy/ }));

			expect(host.values()).toEqual(["cozy", "co-op"]);
			expect(tagsTrigger()).toHaveAccessibleName("Tags: cozy, co-op");
		});

		it("opens the same bottom sheet on mobile", async () => {
			const { user, host } = await renderCompact(true);

			await user.click(tagsTrigger());
			const sheet = screen.getByRole("dialog", {
				name: "Filter by your tags"
			});
			await user.click(
				within(sheet).getByRole("option", { name: /^short/ })
			);
			await user.click(
				within(sheet).getByRole("button", { name: "Done" })
			);

			expect(host.values()).toEqual(["short"]);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("mobile sheet", () => {
		it("opens a bottom sheet with the same options and closes it with Done", async () => {
			const { user, host, openPopover } = await renderPicker(
				[],
				platforms,
				true
			);

			await openPopover();
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
