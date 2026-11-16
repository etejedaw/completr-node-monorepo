import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import {
	type AddRewindAiRecapRequest,
	type Rewind,
	type RewindOwnerControls
} from "../../../../core/models/rewind.model";
import { RewindAiRecapDialog } from "./rewind-ai-recap-dialog";

function controls(
	overrides: Partial<RewindOwnerControls> = {}
): RewindOwnerControls {
	return {
		includesPrivateRuns: false,
		includesNotes: false,
		regenerationsLeft: 1,
		graceEndsAt: null,
		canRegenerate: true,
		regenerationBlockedBy: null,
		aiRecapState: "available",
		periodOpen: true,
		periodStatus: "open",
		closesAt: "2027-01-31",
		frozenAt: null,
		...overrides
	};
}

function rewindFixture(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: 2026,
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: controls(),
		...overrides
	} as Rewind;
}

describe("RewindAiRecapDialog", () => {
	let submitted: AddRewindAiRecapRequest[];
	let closed: number;

	async function renderDialog(rewind: Rewind) {
		const result = await render(RewindAiRecapDialog, {
			inputs: { rewind },
			on: {
				submitted: (value: AddRewindAiRecapRequest) =>
					submitted.push(value),
				closed: () => closed++
			},
			providers: [provideRouter([])]
		});
		return result;
	}

	async function dialog() {
		return screen.findByRole("dialog", {
			name: "Add the AI recap to your 2026 Rewind"
		});
	}

	beforeEach(() => {
		submitted = [];
		closed = 0;
		vi.spyOn(performance, "now").mockReturnValue(10_000);
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("names the year and starts with both privacy switches off", async () => {
		await renderDialog(rewindFixture());
		const element = await dialog();

		expect(
			within(element).getByRole("switch", {
				name: "Include private runs"
			})
		).toHaveAttribute("aria-checked", "false");
		expect(
			within(element).getByRole("switch", { name: "Use my notes" })
		).toHaveAttribute("aria-checked", "false");
	});

	it("prefills the switches from what the Rewind already includes", async () => {
		await renderDialog(
			rewindFixture({
				ownerControls: controls({
					includesPrivateRuns: true,
					includesNotes: true
				})
			})
		);
		const element = await dialog();

		expect(
			within(element).getByRole("switch", {
				name: "Include private runs"
			})
		).toHaveAttribute("aria-checked", "true");
		expect(
			within(element).getByRole("switch", { name: "Use my notes" })
		).toHaveAttribute("aria-checked", "true");
	});

	it("announces the premium stats only when the Rewind has none", async () => {
		const { fixture } = await renderDialog(rewindFixture());
		const element = await dialog();

		expect(
			within(element).getByText(
				"Your premium stats will be added to this Rewind too."
			)
		).toBeInTheDocument();

		fixture.componentRef.setInput(
			"rewind",
			rewindFixture({ premiumStats: {} as Rewind["premiumStats"] })
		);
		fixture.detectChanges();

		expect(
			screen.queryByText(
				"Your premium stats will be added to this Rewind too."
			)
		).toBeNull();
	});

	it("emits the request with the switches as left by the owner", async () => {
		await renderDialog(rewindFixture());
		const element = await dialog();
		await userEvent.click(
			within(element).getByRole("switch", { name: "Use my notes" })
		);

		await userEvent.click(
			within(element).getByRole("button", { name: "Write AI recap" })
		);

		expect(submitted).toEqual([
			{ includePrivateRuns: false, includeNotes: true }
		]);
		expect(closed).toBe(0);
	});

	it("emits the prefilled values untouched", async () => {
		await renderDialog(
			rewindFixture({
				ownerControls: controls({ includesPrivateRuns: true })
			})
		);
		const element = await dialog();

		await userEvent.click(
			within(element).getByRole("button", { name: "Write AI recap" })
		);

		expect(submitted).toEqual([
			{ includePrivateRuns: true, includeNotes: false }
		]);
	});

	it("closes on Cancel without a request", async () => {
		await renderDialog(rewindFixture());
		const element = await dialog();

		await userEvent.click(
			within(element).getByRole("button", { name: "Cancel" })
		);

		expect(closed).toBe(1);
		expect(submitted).toEqual([]);
	});

	it("keeps the DeepSeek notice behind the help button", async () => {
		await renderDialog(rewindFixture());
		const element = await dialog();
		const help = within(element).getByRole("button", {
			name: "Who writes the AI recap"
		});

		expect(within(element).queryByText(/written by DeepSeek/)).toBeNull();
		await userEvent.click(help);

		expect(help).toHaveAttribute("aria-expanded", "true");
		expect(
			within(element).getByText(/written by DeepSeek/)
		).toBeInTheDocument();
	});
});
