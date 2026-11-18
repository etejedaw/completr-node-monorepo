import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UiChipOption } from "../../../../shared/ui";
import { BacklogTagFilter } from "./backlog-tag-filter";
import { type BacklogTagFilterStatus } from "./backlog-tag-filter.model";

function options(count: number, prefix = "tag"): UiChipOption[] {
	return Array.from({ length: count }, (_, index) => ({
		value: `${prefix}${index + 1}`,
		label: `${prefix}${index + 1}`
	}));
}

@Component({
	selector: "app-tag-filter-host",
	imports: [BacklogTagFilter],
	template: `
		<app-backlog-tag-filter
			[options]="options()"
			[selected]="selected()"
			[status]="status()"
			(manageOpened)="manageOpenings = manageOpenings + 1"
			(selectedChange)="changeSelected($event)"
			(limitReached)="limits.push($event)"
			(retried)="retries = retries + 1"
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class TagFilterHost {
	readonly options = signal<UiChipOption[]>(options(3));
	readonly selected = signal<string[]>([]);
	readonly status = signal<BacklogTagFilterStatus>("ready");
	manageOpenings = 0;
	readonly selections: string[][] = [];
	readonly limits: number[] = [];
	retries = 0;

	changeSelected(tags: string[]) {
		this.selections.push(tags);
		this.selected.set(tags);
	}
}

@Component({
	selector: "app-empty-route",
	template: "",
	changeDetection: ChangeDetectionStrategy.OnPush
})
class EmptyRoute {}

describe("BacklogTagFilter", () => {
	async function renderFilter(setup?: (host: TagFilterHost) => void) {
		const result = await render(TagFilterHost, {
			providers: [
				provideRouter([{ path: "tags", component: EmptyRoute }])
			]
		});
		const host = result.fixture.componentInstance;
		setup?.(host);
		result.fixture.detectChanges();
		return { ...result, host };
	}

	function chip(name: string) {
		return within(
			screen.getByRole("group", { name: "Filter by your tags" })
		).getByRole("button", { name: new RegExp(`^${name}\\b`) });
	}

	it("toggles a tag on and off, even with a double click", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter();

		await user.click(chip("tag2"));
		expect(chip("tag2")).toHaveAttribute("aria-pressed", "true");

		await user.dblClick(chip("tag1"));

		expect(host.selections).toEqual([["tag2"], ["tag2", "tag1"], ["tag2"]]);
		expect(chip("tag1")).toHaveAttribute("aria-pressed", "false");
	});

	it("marks the selected chip with the brand fill and every chip with a decorative tag icon", async () => {
		await renderFilter(host => host.selected.set(["tag2"]));

		expect(chip("tag2")).toHaveAttribute("data-selected");
		expect(chip("tag2").className).toContain("text-white");
		expect(chip("tag1")).not.toHaveAttribute("data-selected");
		for (const name of ["tag1", "tag2", "tag3"]) {
			const icon = chip(name).querySelector("[aria-hidden='true']");
			expect(icon).toHaveTextContent("sell");
		}
		expect(chip("tag1")).toHaveAccessibleName("tag1");
	});

	it("keeps selected tags visible even when they are not in the list", async () => {
		await renderFilter(host => host.selected.set(["ghost"]));

		expect(chip("ghost")).toHaveAttribute("aria-pressed", "true");
	});

	it("refuses an eleventh tag and leaves it unpressed", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter(host => {
			host.options.set(options(11));
			host.selected.set(options(10).map(option => option.value));
		});

		await user.click(chip("tag11"));

		expect(host.limits).toEqual([10]);
		expect(host.selections).toEqual([]);
		expect(chip("tag11")).toHaveAttribute("aria-pressed", "false");
	});

	it("shows twelve tags at first and the rest on demand", async () => {
		const user = userEvent.setup();
		await renderFilter(host => host.options.set(options(15)));

		const group = () => screen.getByRole("group", { name: /Filter by/ });
		expect(within(group()).getAllByRole("button")).toHaveLength(12);

		const toggle = screen.getByRole("button", { name: "Show all 15 tags" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		await user.click(toggle);

		expect(within(group()).getAllByRole("button")).toHaveLength(15);
		await user.click(
			screen.getByRole("button", { name: "Show fewer tags" })
		);
		expect(within(group()).getAllByRole("button")).toHaveLength(12);
	});

	it("keeps a selected tag beyond the first twelve visible when collapsed", async () => {
		await renderFilter(host => {
			host.options.set(options(15));
			host.selected.set(["tag14"]);
		});

		expect(chip("tag14")).toHaveAttribute("aria-pressed", "true");
		expect(
			within(
				screen.getByRole("group", { name: /Filter by/ })
			).getAllByRole("button")
		).toHaveLength(13);
	});

	it("offers only your own tags, with no source switch", async () => {
		await renderFilter();

		expect(
			screen.queryByRole("radiogroup", { name: "Tag source" })
		).not.toBeInTheDocument();
		expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Tags" })
		).not.toBeInTheDocument();
	});

	it("toggles and clears in a rapid burst and ends with the last state", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter();

		await user.click(chip("tag1"));
		await user.click(chip("tag3"));
		await user.click(
			screen.getByRole("button", { name: "Clear 2 selected tags" })
		);
		await user.click(chip("tag2"));

		expect(host.selections.at(-1)).toEqual(["tag2"]);
		expect(chip("tag2")).toHaveAttribute("aria-pressed", "true");
		expect(chip("tag1")).toHaveAttribute("aria-pressed", "false");
	});

	it("clears the selection", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter(host =>
			host.selected.set(["tag1", "tag3"])
		);

		await user.click(
			screen.getByRole("button", { name: "Clear 2 selected tags" })
		);

		expect(host.selections).toEqual([[]]);
		expect(
			screen.queryByRole("button", { name: /Clear/ })
		).not.toBeInTheDocument();
	});

	it("explains an empty list of your own tags and links to manage them", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter(host => host.options.set([]));

		expect(screen.getByText(/No tags yet/)).toBeInTheDocument();
		const manage = screen.getByRole("link", { name: "Manage tags" });
		expect(manage).toHaveAttribute("href", "/tags");

		await user.click(manage);

		expect(host.manageOpenings).toBe(1);
	});

	it("shows chip placeholders while loading", async () => {
		await renderFilter(host => host.status.set("loading"));

		expect(screen.getByLabelText("Loading tags")).toHaveAttribute(
			"aria-busy",
			"true"
		);
		expect(
			screen.queryByRole("group", { name: /Filter by/ })
		).not.toBeInTheDocument();
	});

	it("offers a retry when the tags fail to load", async () => {
		const user = userEvent.setup();
		const { host } = await renderFilter(host => host.status.set("error"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't load these tags."
		);
		await user.click(screen.getByRole("button", { name: "Try again" }));

		expect(host.retries).toBe(1);
	});
});
