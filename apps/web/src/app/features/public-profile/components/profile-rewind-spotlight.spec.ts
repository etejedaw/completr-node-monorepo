import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import {
	type Rewind,
	type RewindYearSummary
} from "../../../core/models/rewind.model";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { ProfileRewindSpotlight } from "./profile-rewind-spotlight";

const cover = (id: string) => ({
	gameId: id,
	code: id,
	title: `Game ${id}`,
	coverUrl: null,
	backgroundUrl: null
});

function summary(
	overrides: Partial<RewindYearSummary> = {}
): RewindYearSummary {
	return {
		isGenerated: true,
		year: 2026,
		finishedCount: 18,
		startedCount: 23,
		hoursPlayed: 212,
		persona: "genre-explorer" as const,
		covers: ["a", "b", "c", "d", "e"].map(cover),
		...overrides
	};
}

describe("ProfileRewindSpotlight", () => {
	async function renderSpotlight(
		value: RewindYearSummary,
		{ isSelf = false, hasMoreYears = false } = {}
	) {
		const result = await render(ProfileRewindSpotlight, {
			inputs: { username: "ada", summary: value, isSelf, hasMoreYears },
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
		return result.container as HTMLElement;
	}

	it("shows the year, the finished count and the hours with a decorative fan of covers", async () => {
		const container = await renderSpotlight(summary());

		expect(
			screen.getByRole("heading", { name: "Rewind 2026" })
		).toBeInTheDocument();
		expect(screen.getByText("finished")).toBeInTheDocument();
		expect(screen.getByText("18")).toBeInTheDocument();
		expect(screen.getByText("h played")).toBeInTheDocument();
		expect(screen.getByText("212")).toBeInTheDocument();
		const posters = container.querySelectorAll("app-game-poster");
		expect(posters).toHaveLength(5);
		expect(posters[0].closest("[aria-hidden='true']")).not.toBeNull();
	});

	it("shows the persona of the year as a subtitle", async () => {
		await renderSpotlight(summary());

		expect(screen.getByText("Genre Explorer")).toBeInTheDocument();
		expect(
			screen.queryByText("No genre was safe from you this year.")
		).not.toBeInTheDocument();
	});

	it("addresses a visitor by the owner's username and hides Past rewinds with a single year", async () => {
		await renderSpotlight(summary());

		expect(
			screen.getByRole("link", { name: "See @ada's Rewind" })
		).toHaveAttribute("href", "/user/ada/rewind/2026");
		expect(
			screen.queryByRole("link", { name: "Past rewinds" })
		).not.toBeInTheDocument();
	});

	it("addresses the owner and links past rewinds when there are more years", async () => {
		await renderSpotlight(summary(), { isSelf: true, hasMoreYears: true });

		expect(
			screen.getByRole("link", { name: "See your Rewind" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Past rewinds" })
		).toHaveAttribute("href", "/user/ada/rewind");
	});

	it("counts started games and says the year is ready when nothing was finished", async () => {
		const container = await renderSpotlight(
			summary({ finishedCount: 0, covers: [] }),
			{ isSelf: true }
		);

		expect(screen.getByText("started")).toBeInTheDocument();
		expect(screen.getByText("23")).toBeInTheDocument();
		expect(
			screen.getByText("Your year in games is ready")
		).toBeInTheDocument();
		expect(container.querySelectorAll("app-game-poster")).toHaveLength(0);
	});

	it("tells a visitor whose year is ready", async () => {
		await renderSpotlight(summary({ finishedCount: 0, covers: [] }));

		expect(
			screen.getByText("@ada's year in games is ready")
		).toBeInTheDocument();
	});

	describe("fan of covers", () => {
		let observerCallback: (entries: { isIntersecting: boolean }[]) => void;
		let reducedMotion: boolean;

		function stubBrowser() {
			vi.stubGlobal(
				"matchMedia",
				vi.fn(() => ({ matches: reducedMotion }))
			);
			vi.stubGlobal(
				"IntersectionObserver",
				class {
					constructor(handler: typeof observerCallback) {
						observerCallback = handler;
					}
					observe = vi.fn();
					disconnect = vi.fn();
				}
			);
		}

		function rotations(container: HTMLElement) {
			return [
				...container.querySelectorAll<HTMLElement>("app-game-poster")
			].map(poster => poster.style.rotate);
		}

		beforeEach(() => {
			reducedMotion = false;
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("starts stacked and opens once it enters the screen", async () => {
			stubBrowser();
			const { container, fixture } = await render(
				ProfileRewindSpotlight,
				{
					inputs: {
						username: "ada",
						summary: summary(),
						isSelf: false,
						hasMoreYears: false
					},
					providers: [
						provideRouter([]),
						provideHttpClient(),
						provideHttpClientTesting()
					]
				}
			);
			expect(rotations(container)).toEqual([
				"0deg",
				"0deg",
				"0deg",
				"0deg",
				"0deg"
			]);

			observerCallback([{ isIntersecting: true }]);
			fixture.detectChanges();
			observerCallback([{ isIntersecting: false }]);
			fixture.detectChanges();

			expect(rotations(container)).toEqual([
				"-12deg",
				"-6deg",
				"0deg",
				"6deg",
				"12deg"
			]);
		});

		it("is already open when the user prefers reduced motion", async () => {
			reducedMotion = true;
			stubBrowser();
			const { container } = await render(ProfileRewindSpotlight, {
				inputs: {
					username: "ada",
					summary: summary(),
					isSelf: false,
					hasMoreYears: false
				},
				providers: [
					provideRouter([]),
					provideHttpClient(),
					provideHttpClientTesting()
				]
			});

			expect(rotations(container)[0]).toBe("-12deg");
		});
	});

	describe("owner invitation before the Rewind is generated", () => {
		let toast: {
			pending: ReturnType<typeof vi.fn>;
			error: ReturnType<typeof vi.fn>;
		};

		async function renderInvitation({ isSelf = true } = {}) {
			const result = await render(ProfileRewindSpotlight, {
				inputs: {
					username: "ada",
					summary: summary({ isGenerated: false }),
					isSelf,
					hasMoreYears: false
				},
				providers: [
					provideRouter([]),
					provideHttpClient(),
					provideHttpClientTesting(),
					{
						provide: AuthService,
						useValue: { isPremium: signal(false) }
					},
					{ provide: ToastService, useValue: toast }
				]
			});
			return result.container as HTMLElement;
		}

		function generatedRewind(): Rewind {
			return {
				year: 2026,
				user: { username: "ada" },
				generatedAt: "2026-12-02T10:00:00.000Z",
				language: "en",
				ownerControls: null
			} as Rewind;
		}

		beforeEach(() => {
			toast = { pending: vi.fn(), error: vi.fn() };
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
			TestBed.inject(HttpTestingController).verify();
		});

		it("invites the owner without revealing the persona or the numbers", async () => {
			const container = await renderInvitation();

			expect(
				screen.getByRole("heading", { name: "Rewind 2026" })
			).toBeInTheDocument();
			expect(
				screen.getByText("Your 2026 is ready to rewind")
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Generate your Rewind" })
			).toBeInTheDocument();
			expect(screen.queryByText("Genre Explorer")).toBeNull();
			expect(screen.queryByText("18")).toBeNull();
			expect(screen.queryByText("h played")).toBeNull();
			expect(
				screen.queryByRole("link", { name: "See your Rewind" })
			).toBeNull();
			const teaser = container.querySelector("[data-rewind-teaser]")!;
			expect(teaser).toHaveAttribute("aria-hidden", "true");
			expect(teaser.querySelectorAll("app-game-poster")).toHaveLength(5);
		});

		it("renders nothing for a visitor if an unpublished year ever reaches the page", async () => {
			const container = await renderInvitation({ isSelf: false });

			expect(within(container).queryByRole("heading")).toBeNull();
			expect(within(container).queryByRole("button")).toBeNull();
			expect(container.querySelector("app-game-poster")).toBeNull();
		});

		it("opens a single dialog on a double click and navigates to the Rewind once generated", async () => {
			await renderInvitation();
			const navigate = vi
				.spyOn(TestBed.inject(Router), "navigate")
				.mockResolvedValue(true);

			await userEvent.dblClick(
				screen.getByRole("button", { name: "Generate your Rewind" })
			);
			const dialogs = await screen.findAllByRole("dialog", {
				name: "Generate your 2026 Rewind"
			});
			expect(dialogs).toHaveLength(1);
			await userEvent.click(
				within(dialogs[0]).getByRole("button", { name: "Generate" })
			);
			TestBed.inject(HttpTestingController)
				.expectOne(`${environment.apiUrl}/users/me/rewinds/2026`)
				.flush({ data: generatedRewind() });

			await waitFor(() =>
				expect(navigate).toHaveBeenCalledWith([
					"/user",
					"ada",
					"rewind",
					2026
				])
			);
			expect(
				await screen.findByRole("link", { name: "See your Rewind" })
			).toBeInTheDocument();
		});

		it("turns into the regular hero without navigating when the dialog was closed mid-request", async () => {
			await renderInvitation();
			const navigate = vi
				.spyOn(TestBed.inject(Router), "navigate")
				.mockResolvedValue(true);
			await userEvent.click(
				screen.getByRole("button", { name: "Generate your Rewind" })
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Generate your 2026 Rewind"
			});
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Generate" })
			);
			expect(
				screen.getAllByRole("button", { name: "Rewinding…" })
			).toHaveLength(2);
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Close" })
			);

			TestBed.inject(HttpTestingController)
				.expectOne(`${environment.apiUrl}/users/me/rewinds/2026`)
				.flush({ data: generatedRewind() });

			expect(
				await screen.findByRole("link", { name: "See your Rewind" })
			).toBeInTheDocument();
			expect(screen.getByText("Genre Explorer")).toBeInTheDocument();
			expect(navigate).not.toHaveBeenCalled();
			expect(toast.pending).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Your 2026 Rewind is ready"
				})
			);
		});
	});
});
