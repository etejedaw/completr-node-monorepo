import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../../core/services/viewport";
import { type UiChipOption } from "../../../../shared/ui";
import { BacklogFiltersPanel } from "./backlog-filters-panel";

const myTagOptions: UiChipOption[] = [
	{ value: "cozy", label: "cozy", count: 4 },
	{ value: "short", label: "short", count: 1 }
];

@Component({
	selector: "app-empty-route",
	template: "",
	changeDetection: ChangeDetectionStrategy.OnPush
})
class EmptyRoute {}

describe("BacklogFiltersPanel tags", () => {
	async function renderPanel(
		inputs: Record<string, unknown> = {},
		isMobile = false
	) {
		const result = await render(BacklogFiltersPanel, {
			inputs: { tagOptions: myTagOptions, ...inputs },
			providers: [
				provideRouter([{ path: "tags", component: EmptyRoute }]),
				{
					provide: ViewportService,
					useValue: { isMobile: signal(isMobile) }
				}
			]
		});
		const panel = result.fixture.componentInstance;
		const events = {
			moodTags: vi.fn(),
			closed: vi.fn(),
			limit: vi.fn(),
			retried: vi.fn()
		};
		panel.selectedMoodTags.subscribe(events.moodTags);
		panel.closed.subscribe(events.closed);
		panel.tagLimitReached.subscribe(events.limit);
		panel.tagsRetried.subscribe(events.retried);
		return { user: userEvent.setup(), fixture: result.fixture, events };
	}

	function tagsSection() {
		return within(screen.getByRole("group", { name: "Tags" }));
	}

	function chip(name: string) {
		return tagsSection().getByRole("button", {
			name: new RegExp(`^${name}\\b`)
		});
	}

	it("offers the user's tags as chips, not as an empty text field", async () => {
		await renderPanel();

		expect(chip("cozy")).toHaveAttribute("aria-pressed", "false");
		expect(chip("short")).toHaveTextContent("1");
		expect(tagsSection().queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.queryByText(/relajante/)).not.toBeInTheDocument();
	});

	it("marks the tags already selected in the list", async () => {
		await renderPanel({ selectedMoodTags: ["short"] });

		expect(chip("short")).toHaveAttribute("aria-pressed", "true");
		expect(chip("cozy")).toHaveAttribute("aria-pressed", "false");
	});

	it("writes the chosen tags to the shared selection", async () => {
		const { user, fixture, events } = await renderPanel();

		await user.click(chip("cozy"));
		fixture.detectChanges();
		await user.click(chip("short"));

		expect(events.moodTags).toHaveBeenLastCalledWith(["cozy", "short"]);
	});

	it("survives a double click on a chip and ends unselected", async () => {
		const { user, events } = await renderPanel();

		await user.dblClick(chip("cozy"));

		expect(events.moodTags).toHaveBeenLastCalledWith([]);
		expect(chip("cozy")).toHaveAttribute("aria-pressed", "false");
	});

	it("only offers the user's own tags, with no community source", async () => {
		await renderPanel();

		expect(
			tagsSection().queryByRole("radiogroup", { name: "Tag source" })
		).not.toBeInTheDocument();
		expect(tagsSection().queryByText(/Community/)).not.toBeInTheDocument();
	});

	it("shows a short empty state with Manage tags when the user has no tags", async () => {
		const { user, events } = await renderPanel({ tagOptions: [] });

		expect(tagsSection().getByText(/No tags yet/)).toBeInTheDocument();
		const links = tagsSection().getAllByRole("link", {
			name: /Manage tags/
		});
		expect(links).toHaveLength(1);

		await user.click(links[0]);

		expect(events.closed).toHaveBeenCalledTimes(1);
	});

	it("keeps Manage tags as the section action when the user has tags", async () => {
		await renderPanel();

		expect(
			tagsSection().getByRole("link", { name: "Manage tags →" })
		).toHaveAttribute("href", "/tags");
	});

	it("passes the tag limit and retries up to the page", async () => {
		const { user, events } = await renderPanel({
			tagOptions: Array.from({ length: 11 }, (_, i) => ({
				value: `t${i}`,
				label: `t${i}`
			})),
			selectedMoodTags: Array.from({ length: 10 }, (_, i) => `t${i}`)
		});

		await user.click(chip("t10"));

		expect(events.limit).toHaveBeenCalledWith(10);
		expect(events.moodTags).not.toHaveBeenCalled();
	});

	it("offers a retry when the tags could not be loaded", async () => {
		const { user, events } = await renderPanel({ tagStatus: "error" });

		await user.click(
			tagsSection().getByRole("button", { name: "Try again" })
		);

		expect(events.retried).toHaveBeenCalledTimes(1);
	});

	it("shows the same chips in the mobile sheet", async () => {
		await renderPanel({}, true);

		expect(chip("cozy")).toBeInTheDocument();
	});
});
