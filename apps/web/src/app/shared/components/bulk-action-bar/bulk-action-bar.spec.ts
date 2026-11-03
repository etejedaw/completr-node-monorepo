import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { BulkActionBar } from "./bulk-action-bar";
import { type BulkAction } from "./bulk-action-bar.model";

const ACTIONS: BulkAction[] = [
	{
		id: "status",
		label: "Change status",
		icon: "swap_horiz",
		eligibleCount: 7,
		tone: "default"
	},
	{
		id: "rate",
		label: "Rate",
		icon: "star",
		eligibleCount: 5,
		tone: "default"
	},
	{
		id: "favorite",
		label: "Favorite",
		icon: "favorite",
		eligibleCount: 3,
		tone: "default"
	},
	{
		id: "queue",
		label: "Add to Up Next",
		icon: "playlist_add",
		eligibleCount: 0,
		tone: "default"
	},
	{
		id: "private",
		label: "Make private",
		icon: "lock",
		eligibleCount: 2,
		tone: "default",
		overflow: true
	},
	{
		id: "delete",
		label: "Delete runs",
		icon: "delete",
		eligibleCount: 12,
		tone: "danger"
	}
];

@Component({
	imports: [BulkActionBar],
	template: `
		<div class="page-scroller">
			<app-bulk-action-bar
				[count]="count()"
				[actions]="actions()"
				[noun]="{ one: 'run', other: 'runs' }"
				[busy]="busy()"
				(actionTriggered)="triggered.push($event)"
				(cleared)="clears = clears + 1"
			/>
		</div>
		<div role="dialog" aria-label="Rate runs">
			<button type="button">Inside dialog</button>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	readonly count = signal(12);
	readonly actions = signal<BulkAction[]>(ACTIONS);
	readonly busy = signal(false);
	readonly triggered: string[] = [];
	clears = 0;
}

describe("BulkActionBar", () => {
	let mobile = false;

	beforeEach(() => {
		mobile = false;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: mobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => vi.unstubAllGlobals());

	async function renderBar() {
		const result = await render(Host);
		return { ...result, host: result.fixture.componentInstance };
	}

	function toolbar() {
		return within(screen.getByRole("toolbar", { name: "Bulk actions" }));
	}

	it("announces the full selection text and hides when nothing is selected", async () => {
		const { fixture, host } = await renderBar();
		expect(screen.getByRole("status")).toHaveTextContent(
			"12 runs selected"
		);
		expect(screen.getByRole("status")).toHaveAttribute(
			"aria-atomic",
			"true"
		);

		host.count.set(1);
		fixture.detectChanges();
		expect(screen.getByRole("status")).toHaveTextContent("1 run selected");

		host.count.set(0);
		fixture.detectChanges();
		await fixture.whenStable();
		expect(screen.getByRole("status")).toHaveTextContent("");
		expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
	});

	it("shows each action with its eligible count and disables the empty ones", async () => {
		await renderBar();
		expect(
			toolbar().getByRole("button", { name: "Change status (7)" })
		).toBeEnabled();
		expect(
			toolbar().getByRole("button", { name: "Add to Up Next (0)" })
		).toBeDisabled();
		expect(
			toolbar().getByRole("button", { name: "Delete runs (12)" })
		).toHaveAttribute("data-variant", "danger");
		expect(
			toolbar().queryByRole("button", { name: "Make private (2)" })
		).not.toBeInTheDocument();
	});

	it("emits the chosen action, also from the More menu", async () => {
		const user = userEvent.setup();
		const { host } = await renderBar();
		await user.click(toolbar().getByRole("button", { name: "Rate (5)" }));
		await user.click(
			toolbar().getByRole("button", { name: "Add to Up Next (0)" })
		);
		await user.click(toolbar().getByRole("button", { name: /More/ }));
		await user.click(
			within(
				await screen.findByRole("menu", { name: "More actions" })
			).getByRole("menuitem", { name: /Make private \(2\)/ })
		);
		expect(host.triggered).toEqual(["rate", "private"]);
	});

	it("blocks every action while one is running", async () => {
		const user = userEvent.setup();
		const { fixture, host } = await renderBar();
		host.busy.set(true);
		fixture.detectChanges();
		await user.dblClick(
			toolbar().getByRole("button", { name: "Delete runs (12)" })
		);
		expect(host.triggered).toEqual([]);
		expect(screen.getByRole("toolbar")).toHaveAttribute(
			"aria-busy",
			"true"
		);
	});

	it("clears with the close button and with Escape, but not from inside a dialog", async () => {
		const user = userEvent.setup();
		const { host } = await renderBar();
		await user.click(
			toolbar().getByRole("button", { name: "Clear selection" })
		);
		expect(host.clears).toBe(1);

		await user.keyboard("{Escape}");
		expect(host.clears).toBe(2);

		screen.getByRole("button", { name: "Inside dialog" }).focus();
		await user.keyboard("{Escape}");
		expect(host.clears).toBe(2);
	});

	it("does not clear on Escape when nothing is selected", async () => {
		const user = userEvent.setup();
		const { fixture, host } = await renderBar();
		host.count.set(0);
		fixture.detectChanges();
		await user.keyboard("{Escape}");
		expect(host.clears).toBe(0);
	});

	it("keeps the focused control clear of the bar while it is visible", async () => {
		const { fixture, host } = await renderBar();
		const scroller = document.querySelector(
			".page-scroller"
		) as HTMLElement;
		expect(scroller.style.scrollPaddingBottom).toBe("80px");
		host.count.set(0);
		fixture.detectChanges();
		await fixture.whenStable();
		expect(scroller.style.scrollPaddingBottom).toBe("");
	});

	it("moves the extra actions into More on mobile, keeping icon-only buttons named", async () => {
		mobile = true;
		const user = userEvent.setup();
		const { host } = await renderBar();
		expect(
			toolbar().getByRole("button", { name: "Change status (7)" })
		).toBeInTheDocument();
		expect(
			toolbar().queryByRole("button", { name: "Add to Up Next (0)" })
		).not.toBeInTheDocument();

		await user.click(toolbar().getByRole("button", { name: "More" }));
		const sheet = await screen.findByRole("dialog", {
			name: "More actions"
		});
		expect(
			within(sheet).getByRole("button", { name: /Add to Up Next \(0\)/ })
		).toBeDisabled();
		await user.click(
			within(sheet).getByRole("button", { name: /Make private \(2\)/ })
		);
		expect(host.triggered).toEqual(["private"]);
	});
});
