import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../../core/services/viewport";
import { BacklogFiltersPanel } from "./backlog-filters-panel";

describe("BacklogFiltersPanel date ranges", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function renderPanel(inputs: Record<string, string> = {}) {
		const result = await render(BacklogFiltersPanel, {
			inputs,
			providers: [
				provideRouter([]),
				{
					provide: ViewportService,
					useValue: { isMobile: signal(false) }
				}
			]
		});
		return { user: userEvent.setup(), fixture: result.fixture };
	}

	async function openPicker(
		user: ReturnType<typeof userEvent.setup>,
		name: RegExp,
		fixture: { whenStable(): Promise<unknown> }
	) {
		await user.click(screen.getByRole("button", { name }));
		await fixture.whenStable();
		return screen.getByRole("grid");
	}

	it("does not let Started from go past Started to", async () => {
		const { user, fixture } = await renderPanel({
			startedTo: "2026-11-12"
		});

		const grid = await openPicker(user, /^Started from:/, fixture);

		expect(
			within(grid).getByRole("button", {
				name: "Thursday, November 12, 2026"
			})
		).toBeEnabled();
		expect(
			within(grid).getByRole("button", {
				name: "Friday, November 13, 2026"
			})
		).toBeDisabled();
	});

	it("does not let Finished to go before Finished from", async () => {
		const { user, fixture } = await renderPanel({
			finishedFrom: "2026-11-05"
		});

		const grid = await openPicker(user, /^Finished to:/, fixture);
		await user.click(
			within(grid).getByRole("button", {
				name: "Wednesday, November 4, 2026"
			})
		);
		expect(screen.getByRole("grid")).toBeInTheDocument();
		await user.click(
			within(grid).getByRole("button", {
				name: "Thursday, November 5, 2026"
			})
		);

		expect(
			screen.getByRole("button", { name: /^Finished to:/ })
		).toHaveAccessibleName("Finished to: Nov 5, 2026");
		expect(fixture.componentInstance.finishedTo()).toBe("2026-11-05");
	});

	it("clears one end of the range without touching the other", async () => {
		const { user, fixture } = await renderPanel({
			startedFrom: "2026-11-01",
			startedTo: "2026-11-20"
		});

		await user.click(
			screen.getByRole("button", { name: "Clear Started from" })
		);

		expect(fixture.componentInstance.startedFrom()).toBe("");
		expect(fixture.componentInstance.startedTo()).toBe("2026-11-20");
		expect(
			screen.getByRole("button", { name: /^Started from:/ })
		).toHaveAccessibleName("Started from: Any");
	});
});
