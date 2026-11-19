import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UiPickerOption } from "../../ui";
import { MyTagFilter } from "./my-tag-filter";
import {
	openTagsPicker,
	queryTagsPicker,
	tagOption,
	tagsPicker
} from "./my-tag-filter.testing";

@Component({
	selector: "app-my-tag-filter-host",
	imports: [MyTagFilter],
	template: `
		<app-my-tag-filter
			[options]="options()"
			[values]="values()"
			(valuesChange)="change($event)"
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class MyTagFilterHost {
	readonly options = signal<UiPickerOption[]>([
		{ value: "cozy", label: "cozy", icon: "local_cafe", count: 3 },
		{ value: "short", label: "short", icon: "sell", count: 1 }
	]);
	readonly values = signal<readonly string[]>([]);
	readonly emitted: (readonly string[])[] = [];

	change(tags: readonly string[]) {
		this.emitted.push(tags);
		this.values.set(tags);
	}
}

describe("MyTagFilter", () => {
	beforeEach(() =>
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		)
	);

	afterEach(() => vi.unstubAllGlobals());

	async function renderFilter() {
		const { fixture } = await render(MyTagFilterHost);
		return fixture.componentInstance;
	}

	it("shows a compact Tags picker that reads Any with nothing selected", async () => {
		await renderFilter();

		expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
	});

	it("renders nothing when there are no tags to offer", async () => {
		const { fixture } = await render(MyTagFilterHost);
		fixture.componentInstance.options.set([]);
		fixture.detectChanges();

		expect(queryTagsPicker()).not.toBeInTheDocument();
	});

	it("emits each tag picked and names the selection on the trigger", async () => {
		const user = userEvent.setup();
		const host = await renderFilter();

		await openTagsPicker(user);
		await user.click(tagOption("short"));
		await user.click(tagOption("cozy"));

		expect(host.emitted).toEqual([["short"], ["cozy", "short"]]);
		expect(tagsPicker()).toHaveAccessibleName("Tags: cozy, short");
	});

	it("ends with nothing selected after a double click on a tag", async () => {
		const user = userEvent.setup();
		const host = await renderFilter();

		await openTagsPicker(user);
		await user.dblClick(tagOption("cozy"));

		expect(host.emitted.at(-1)).toEqual([]);
		expect(tagOption("cozy")).toHaveAttribute("aria-selected", "false");
		expect(tagsPicker()).toHaveAccessibleName("Tags: Any");
	});
});
