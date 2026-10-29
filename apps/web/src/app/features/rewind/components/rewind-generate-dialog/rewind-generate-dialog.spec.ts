import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import {
	ChangeDetectionStrategy,
	Component,
	signal,
	type WritableSignal
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../../environments/environment";
import { type Rewind } from "../../../../core/models/rewind.model";
import { AuthService } from "../../../../core/services/auth";
import { ToastService } from "../../../../core/services/toast";
import { RewindGenerateDialog } from "./rewind-generate-dialog";
import { injectRewindGenerateFlow } from "./rewind-generate-flow";

const api = environment.apiUrl;
const generateUrl = `${api}/users/me/rewinds/2026`;
const rewindUrl = `${api}/users/ada/rewinds/2026`;

function rewindFixture(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: 2026,
		persona: "finisher",
		user: { username: "ada", name: "Ada", avatarUrl: null, role: "user" },
		isSpotlight: true,
		otherYears: [],
		totals: {
			finished: 3,
			abandoned: 0,
			started: 4,
			hoursPlayed: 40,
			platinums: null,
			finishRate: null,
			averageRating: null,
			genresPlayed: 2,
			platformsPlayed: 1
		},
		finishedGames: [],
		highlights: {
			topRated: null,
			bestRatio: null,
			longest: null,
			fastest: null,
			favoriteGenre: null,
			topPlatform: null,
			busiestMonth: null,
			firstFinished: null,
			lastFinished: null,
			topGenres: [],
			topPlatforms: [],
			longestStreak: null
		},
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: {
			includesPrivateRuns: false,
			includesNotes: false,
			regenerationsLeft: 1,
			graceEndsAt: null,
			canRegenerate: true,
			aiRecapState: "unavailable"
		},
		...overrides
	};
}

@Component({
	imports: [RewindGenerateDialog],
	template: `
		<button type="button" (click)="flow.open()">Open generator</button>
		@if (flow.isOpen()) {
			<app-rewind-generate-dialog
				username="ada"
				[year]="2026"
				[rewind]="flow.latestRewind()"
				[pending]="flow.isPending()"
				[error]="flow.error()"
				(submitted)="flow.submit($event)"
				(closed)="flow.close()"
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class GeneratorHost {
	readonly current = signal<Rewind | null>(null);
	readonly generated: Rewind[] = [];
	readonly finishedInDialog: Rewind[] = [];
	readonly flow = injectRewindGenerateFlow({
		username: () => "ada",
		year: () => 2026,
		rewind: () => this.current(),
		onGenerated: rewind => this.generated.push(rewind),
		onFinishedInDialog: rewind => this.finishedInDialog.push(rewind)
	});
}

describe("RewindGenerateDialog", () => {
	let httpTesting: HttpTestingController;
	let isPremium: WritableSignal<boolean>;
	let toast: {
		pending: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};

	async function renderHost(current: Rewind | null = null) {
		const result = await render(GeneratorHost, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: AuthService, useValue: { isPremium } },
				{ provide: ToastService, useValue: toast }
			]
		});
		result.fixture.componentInstance.current.set(current);
		httpTesting = TestBed.inject(HttpTestingController);
		return result.fixture.componentInstance;
	}

	async function openDialog(name = "Generate your 2026 Rewind") {
		await userEvent.click(
			screen.getByRole("button", { name: "Open generator" })
		);
		return screen.findByRole("dialog", { name });
	}

	function dialogNamed(name = "Generate your 2026 Rewind") {
		return screen.queryByRole("dialog", { name });
	}

	function pendingGenerations() {
		return httpTesting.match(generateUrl);
	}

	beforeEach(() => {
		isPremium = signal(false);
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
		httpTesting.verify();
	});

	it("generates the first Rewind in English without private runs by default", async () => {
		const host = await renderHost();
		const dialog = await openDialog();

		expect(
			within(dialog).getByRole("radio", { name: "English" })
		).toHaveAttribute("aria-checked", "true");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({
			language: "en",
			includePrivateRuns: false,
			includeNotes: false,
			expectedGeneratedAt: null
		});
		const rewind = rewindFixture();
		request.flush({ data: rewind });

		await waitFor(() => expect(dialogNamed()).toBeNull());
		expect(host.generated).toEqual([rewind]);
		expect(host.finishedInDialog).toEqual([rewind]);
		expect(toast.pending).not.toHaveBeenCalled();
	});

	it("sends a single request on a double or triple click of Generate", async () => {
		await renderHost();
		const dialog = await openDialog();
		const generate = within(dialog).getByRole("button", {
			name: "Generate"
		});

		await userEvent.dblClick(generate);
		await userEvent.tripleClick(generate);

		const requests = pendingGenerations();
		expect(requests).toHaveLength(1);
		expect(
			within(dialog).getByRole("button", { name: "Rewinding…" })
		).toBeDisabled();
		requests[0].flush({ data: rewindFixture() });
	});

	it("shows a short progress line to a free user and the long one to premium", async () => {
		await renderHost();
		let dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		expect(within(dialog).getByRole("status")).toHaveTextContent(
			"Rewinding your year…"
		);
		expect(within(dialog).getByRole("status")).not.toHaveTextContent(
			"up to a minute"
		);
		pendingGenerations()[0].flush({ data: rewindFixture() });
		await waitFor(() => expect(dialogNamed()).toBeNull());

		isPremium.set(true);
		dialog = await openDialog("Regenerate your 2026 Rewind");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);
		expect(within(dialog).getByRole("status")).toHaveTextContent(
			"this can take up to a minute"
		);
		pendingGenerations()[0].flush({ data: rewindFixture() });
	});

	it("keeps the request alive when the dialog is closed and announces the result with a link instead of navigating", async () => {
		const host = await renderHost();
		const router = TestBed.inject(Router);
		const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
		const dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Close" })
		);
		await waitFor(() => expect(dialogNamed()).toBeNull());
		const rewind = rewindFixture();
		pendingGenerations()[0].flush({ data: rewind });

		expect(host.generated).toEqual([rewind]);
		expect(host.finishedInDialog).toEqual([]);
		expect(navigate).not.toHaveBeenCalled();
		expect(toast.pending).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Your 2026 Rewind is ready",
				undoLabel: "View"
			})
		);
		toast.pending.mock.calls[0][0].onUndo();
		expect(navigate).toHaveBeenCalledWith(["/user", "ada", "rewind", 2026]);
	});

	it("reopens in progress while a closed request is still running and never sends a second one", async () => {
		const host = await renderHost();
		let dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);
		await userEvent.click(
			within(dialog).getByRole("button", {
				name: "Close Generate your 2026 Rewind"
			})
		);
		await waitFor(() => expect(dialogNamed()).toBeNull());

		dialog = await openDialog();
		const busy = within(dialog).getByRole("button", { name: "Rewinding…" });
		await userEvent.click(busy);

		expect(busy).toBeDisabled();
		const requests = pendingGenerations();
		expect(requests).toHaveLength(1);
		requests[0].flush({ data: rewindFixture() });
		await waitFor(() => expect(dialogNamed()).toBeNull());
		expect(host.finishedInDialog).toHaveLength(1);
		expect(toast.pending).not.toHaveBeenCalled();
	});

	it("sends the last language picked after quick changes", async () => {
		await renderHost();
		const dialog = await openDialog();
		const spanish = within(dialog).getByRole("radio", { name: "Español" });
		const english = within(dialog).getByRole("radio", { name: "English" });

		await userEvent.click(spanish);
		await userEvent.click(english);
		await userEvent.dblClick(spanish);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body.language).toBe("es");
		request.flush({ data: rewindFixture({ language: "es" }) });
	});

	it("hides the private runs switch from a free user", async () => {
		await renderHost();
		const dialog = await openDialog();

		expect(
			within(dialog).queryByRole("switch", {
				name: "Include private runs"
			})
		).toBeNull();
		expect(within(dialog).queryByText(/private/i)).toBeNull();
	});

	it("lets a premium user include private runs and warns that visitors read them", async () => {
		isPremium.set(true);
		await renderHost();
		const dialog = await openDialog();
		const toggle = within(dialog).getByRole("switch", {
			name: "Include private runs"
		});
		expect(toggle).toHaveAttribute("aria-checked", "false");

		await userEvent.click(toggle);

		expect(
			within(dialog).getByText(
				/anyone who can see your Rewind will read them/
			)
		).toBeInTheDocument();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);
		const [request] = pendingGenerations();
		expect(request.request.body.includePrivateRuns).toBe(true);
		request.flush({ data: rewindFixture() });
	});

	it("never sends private runs for a free user even if the previous Rewind had them", async () => {
		await renderHost(
			rewindFixture({
				ownerControls: {
					includesPrivateRuns: true,
					includesNotes: false,
					regenerationsLeft: 1,
					graceEndsAt: null,
					canRegenerate: true,
					aiRecapState: "unavailable"
				}
			})
		);
		const dialog = await openDialog("Regenerate your 2026 Rewind");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body.includePrivateRuns).toBe(false);
		request.flush({ data: rewindFixture() });
	});

	it("hides the notes switch from a free user and never sends notes even if the previous Rewind used them", async () => {
		await renderHost(
			rewindFixture({
				ownerControls: {
					includesPrivateRuns: false,
					includesNotes: true,
					regenerationsLeft: 1,
					graceEndsAt: null,
					canRegenerate: true,
					aiRecapState: "unavailable"
				}
			})
		);
		const dialog = await openDialog("Regenerate your 2026 Rewind");

		expect(
			within(dialog).queryByRole("switch", { name: "Use my notes" })
		).toBeNull();
		expect(within(dialog).queryByText(/notes/i)).toBeNull();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body.includeNotes).toBe(false);
		request.flush({ data: rewindFixture() });
	});

	it("keeps the notes switch off by default for premium and explains how the recap uses them", async () => {
		isPremium.set(true);
		await renderHost();
		const dialog = await openDialog();
		const switches = within(dialog).getAllByRole("switch");
		const notes = within(dialog).getByRole("switch", {
			name: "Use my notes"
		});

		expect(switches.indexOf(notes)).toBe(
			switches.indexOf(
				within(dialog).getByRole("switch", {
					name: "Include private runs"
				})
			) + 1
		);
		expect(notes).toHaveAttribute("aria-checked", "false");
		expect(
			within(dialog).queryByText(/never quotes them word for word/)
		).toBeNull();

		await userEvent.click(notes);

		expect(notes).toHaveAttribute("aria-checked", "true");
		expect(
			within(dialog).getByText(
				"Your AI recap reads your notes to understand you as a player. Anyone who can see your Rewind will read the recap, so it never quotes them word for word or names people."
			)
		).toBeInTheDocument();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body).toEqual({
			language: "en",
			includePrivateRuns: false,
			includeNotes: true,
			expectedGeneratedAt: null
		});
		request.flush({ data: rewindFixture() });
	});

	it("sends the notes choice left after toggling it on and off quickly", async () => {
		isPremium.set(true);
		await renderHost();
		const dialog = await openDialog();
		const notes = within(dialog).getByRole("switch", {
			name: "Use my notes"
		});

		await userEvent.click(notes);
		await userEvent.click(notes);
		await userEvent.click(notes);
		await userEvent.click(notes);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body.includeNotes).toBe(false);
		request.flush({ data: rewindFixture() });
	});

	it("preloads the stored notes choice when regenerating and lets the owner turn it off", async () => {
		isPremium.set(true);
		await renderHost(
			rewindFixture({
				ownerControls: {
					includesPrivateRuns: false,
					includesNotes: true,
					regenerationsLeft: 1,
					graceEndsAt: null,
					canRegenerate: true,
					aiRecapState: "ready"
				}
			})
		);
		const dialog = await openDialog("Regenerate your 2026 Rewind");
		const notes = within(dialog).getByRole("switch", {
			name: "Use my notes"
		});

		expect(notes).toHaveAttribute("aria-checked", "true");
		expect(
			within(dialog).getByText(/never quotes them word for word/)
		).toBeInTheDocument();

		await userEvent.click(notes);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const [request] = pendingGenerations();
		expect(request.request.body).toEqual({
			language: "en",
			includePrivateRuns: false,
			includeNotes: false,
			expectedGeneratedAt: "2026-12-02T10:00:00.000Z"
		});
		request.flush({ data: rewindFixture() });
	});

	it("sends a single request with the notes on after a double click of Generate and locks the switch", async () => {
		isPremium.set(true);
		await renderHost();
		const dialog = await openDialog();
		const notes = within(dialog).getByRole("switch", {
			name: "Use my notes"
		});
		await userEvent.click(notes);
		const generate = within(dialog).getByRole("button", {
			name: "Generate"
		});

		await userEvent.dblClick(generate);
		await userEvent.click(notes);

		const requests = pendingGenerations();
		expect(requests).toHaveLength(1);
		expect(requests[0].request.body.includeNotes).toBe(true);
		expect(notes).toHaveAttribute("aria-checked", "true");
		requests[0].flush({ data: rewindFixture() });
	});

	it("regenerates with the current values, the regenerations left and the grace window", async () => {
		isPremium.set(true);
		await renderHost(
			rewindFixture({
				language: "es",
				aiRecap: {
					headline: "h",
					summary: "s",
					insights: [],
					funFact: "f",
					nextYearChallenge: "c"
				},
				ownerControls: {
					includesPrivateRuns: true,
					includesNotes: false,
					regenerationsLeft: 1,
					graceEndsAt: "2027-01-07",
					canRegenerate: true,
					aiRecapState: "ready"
				}
			})
		);
		const dialog = await openDialog("Regenerate your 2026 Rewind");

		expect(
			within(dialog).getByRole("radio", { name: "Español" })
		).toHaveAttribute("aria-checked", "true");
		expect(
			within(dialog).getByRole("switch", { name: "Include private runs" })
		).toHaveAttribute("aria-checked", "true");
		expect(
			within(dialog).getByText("1 regeneration left")
		).toBeInTheDocument();
		expect(
			within(dialog).getByText("Extra regeneration available until Jan 7")
		).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"Regenerating replaces your current Rewind and its AI recap."
			)
		).toBeInTheDocument();

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);
		const [request] = pendingGenerations();
		expect(request.request.body).toEqual({
			language: "es",
			includePrivateRuns: true,
			includeNotes: false,
			expectedGeneratedAt: "2026-12-02T10:00:00.000Z"
		});
		request.flush({ data: rewindFixture() });
	});

	it("blocks Regenerate when no regeneration is left", async () => {
		await renderHost(
			rewindFixture({
				ownerControls: {
					includesPrivateRuns: false,
					includesNotes: false,
					regenerationsLeft: 0,
					graceEndsAt: null,
					canRegenerate: false,
					aiRecapState: "unavailable"
				}
			})
		);
		const dialog = await openDialog("Regenerate your 2026 Rewind");

		expect(
			within(dialog).getByText("No regular regenerations left")
		).toBeInTheDocument();
		const regenerate = within(dialog).getByRole("button", {
			name: "Regenerate"
		});
		expect(regenerate).toBeDisabled();
		await userEvent.click(regenerate);
		expect(pendingGenerations()).toHaveLength(0);
	});

	it("reloads the Rewind and switches to regeneration when another tab already generated it", async () => {
		const host = await renderHost();
		const dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		pendingGenerations()[0].flush(
			{ type: "REWIND_GENERATION_CONFLICT" },
			{ status: 409, statusText: "Conflict" }
		);
		const reloaded = rewindFixture({
			generatedAt: "2026-12-03T08:00:00.000Z"
		});
		httpTesting.expectOne(rewindUrl).flush({ data: reloaded });

		const updated = await screen.findByRole("dialog", {
			name: "Regenerate your 2026 Rewind"
		});
		expect(
			within(updated).getByText(/updated from another tab or device/)
		).toBeInTheDocument();
		expect(
			within(updated).getByRole("link", { name: "See your Rewind" })
		).toHaveAttribute("href", "/user/ada/rewind/2026");
		expect(host.generated).toEqual([reloaded]);
		expect(host.finishedInDialog).toEqual([]);

		await userEvent.click(
			within(updated).getByRole("button", { name: "Regenerate" })
		);
		const [retry] = pendingGenerations();
		expect(retry.request.body.expectedGeneratedAt).toBe(
			"2026-12-03T08:00:00.000Z"
		);
		retry.flush({ data: reloaded });
	});

	it("explains the regeneration limit and disables the action", async () => {
		await renderHost(rewindFixture());
		const dialog = await openDialog("Regenerate your 2026 Rewind");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		pendingGenerations()[0].flush(
			{ type: "REWIND_REGENERATION_LIMIT" },
			{ status: 409, statusText: "Conflict" }
		);
		httpTesting
			.expectOne(rewindUrl)
			.flush({ type: "INTERNAL" }, { status: 500, statusText: "Error" });

		expect(
			await within(dialog).findByText(
				"You've used every regeneration for 2026."
			)
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Regenerate" })
		).toBeDisabled();
	});

	it("explains a year with nothing to rewind and disables the action", async () => {
		await renderHost();
		const dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		pendingGenerations()[0].flush(
			{ type: "REWIND_NOT_FOUND" },
			{ status: 404, statusText: "Not Found" }
		);

		expect(
			await within(dialog).findByText(/nothing to rewind for 2026/)
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Generate" })
		).toBeDisabled();
	});

	it.each([
		[429, "Too many attempts. Wait a moment and try again."],
		[500, "We couldn't generate your Rewind. Try again."],
		[422, "Something in the request wasn't valid. Try again."]
	])(
		"shows the %s error and retries with Try again",
		async (status, message) => {
			const host = await renderHost();
			const dialog = await openDialog();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Generate" })
			);

			pendingGenerations()[0].flush(
				{ type: "ANY" },
				{ status, statusText: "Error" }
			);

			expect(
				await within(dialog).findByText(message)
			).toBeInTheDocument();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Try again" })
			);
			const rewind = rewindFixture();
			pendingGenerations()[0].flush({ data: rewind });
			await waitFor(() => expect(dialogNamed()).toBeNull());
			expect(host.finishedInDialog).toEqual([rewind]);
		}
	);

	it("survives a network error and generates on retry", async () => {
		const host = await renderHost();
		const dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);

		pendingGenerations()[0].error(new ProgressEvent("error"));

		expect(
			await within(dialog).findByText(/seem to be offline/)
		).toBeInTheDocument();
		await userEvent.dblClick(
			within(dialog).getByRole("button", { name: "Try again" })
		);
		const requests = pendingGenerations();
		expect(requests).toHaveLength(1);
		requests[0].flush({ data: rewindFixture() });
		await waitFor(() => expect(host.finishedInDialog).toHaveLength(1));
	});

	it("shows an error toast when the request fails after the dialog was closed", async () => {
		await renderHost();
		const dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Close" })
		);

		pendingGenerations()[0].flush(
			{ type: "INTERNAL" },
			{ status: 500, statusText: "Error" }
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't generate your 2026 Rewind. Try again."
		);
		expect(toast.pending).not.toHaveBeenCalled();
	});

	it("clears a previous error when the dialog is opened again", async () => {
		await renderHost();
		let dialog = await openDialog();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Generate" })
		);
		pendingGenerations()[0].flush(
			{ type: "INTERNAL" },
			{ status: 500, statusText: "Error" }
		);
		await within(dialog).findByText(/couldn't generate/);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		await waitFor(() => expect(dialogNamed()).toBeNull());

		dialog = await openDialog();

		expect(within(dialog).queryByText(/couldn't generate/)).toBeNull();
		expect(
			within(dialog).getByRole("button", { name: "Generate" })
		).toBeEnabled();
	});
});
