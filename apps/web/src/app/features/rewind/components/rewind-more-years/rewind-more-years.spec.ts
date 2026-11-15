import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, throwError } from "rxjs";

import { RewindService } from "../../rewind";
import { RewindMoreYears } from "./rewind-more-years";

const summary = (year: number) => ({
	year,
	isGenerated: true,
	generationBlockedBy: null,
	finishedCount: 2,
	startedCount: 3,
	hoursPlayed: 10,
	persona: "steady-player" as const,
	covers: []
});

describe("RewindMoreYears", () => {
	beforeEach(() => {
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
		vi.unstubAllGlobals();
	});

	async function renderMoreYears(getYears: () => unknown) {
		return render(RewindMoreYears, {
			inputs: { username: "ada", currentYear: 2026 },
			providers: [
				provideRouter([]),
				{ provide: RewindService, useValue: { getYears } }
			]
		});
	}

	it("lists the other years and leaves out the one on screen", async () => {
		await renderMoreYears(() =>
			of({
				spotlightYear: null,
				years: [2026, 2025, 2024].map(summary),
				premiumAccess: { allowed: false, source: null, expiresAt: null }
			})
		);

		expect(
			await screen.findByRole("heading", { name: "More Rewinds" })
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(
			screen.queryByRole("link", { name: /2026/ })
		).not.toBeInTheDocument();
	});

	it("renders nothing when the archive cannot be loaded", async () => {
		await renderMoreYears(() =>
			throwError(() => Object.assign(new Error("down"), { status: 500 }))
		);

		expect(
			screen.queryByRole("heading", { name: "More Rewinds" })
		).not.toBeInTheDocument();
	});

	it.each([403, 404])(
		"hides the section without error when the archive answers %s",
		async status => {
			const getYears = vi.fn(() =>
				throwError(() =>
					Object.assign(new Error("closed"), {
						status,
						error: { type: "USER_PRIVATE" }
					})
				)
			);

			const { container } = await renderMoreYears(getYears);

			expect(getYears).toHaveBeenCalledTimes(1);
			expect(
				screen.queryByRole("heading", { name: "More Rewinds" })
			).not.toBeInTheDocument();
			expect(screen.queryByRole("list")).not.toBeInTheDocument();
			expect(
				container.querySelector("app-rewind-more-years")?.textContent ??
					container.textContent
			).toBe("");
		}
	);

	it("lets the owner generate a previous year because the card knows the access", async () => {
		await renderMoreYears(() =>
			of({
				spotlightYear: null,
				period: null,
				years: [
					2026,
					{
						...summary(2025),
						isGenerated: false,
						generationBlockedBy: null
					}
				].map(entry =>
					typeof entry === "number" ? summary(entry) : entry
				),
				premiumAccess: {
					allowed: true,
					source: "feature-grant",
					expiresAt: null
				}
			})
		);

		await userEvent.click(
			await screen.findByRole("button", {
				name: "Generate your 2025 Rewind"
			})
		);
		const dialog = await screen.findByRole("dialog");

		expect(
			within(dialog).getByRole("button", { name: "Generate" })
		).toBeEnabled();
	});

	it("explains that a previous year needs Premium and offers no Generate button", async () => {
		await renderMoreYears(() =>
			of({
				spotlightYear: null,
				period: null,
				years: [
					summary(2026),
					{
						...summary(2024),
						isGenerated: false,
						generationBlockedBy: "requires-premium"
					}
				],
				premiumAccess: { allowed: false, source: null, expiresAt: null }
			})
		);

		expect(
			await screen.findByText(
				"Rewinds of previous years can only be generated with Premium."
			)
		).toBeVisible();
		expect(screen.queryByRole("button", { name: /Generate/ })).toBeNull();
	});
});
