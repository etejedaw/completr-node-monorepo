import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, RouterOutlet } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../environments/environment";
import {
	type Rewind,
	type RewindYearSummary
} from "../../core/models/rewind.model";
import { ExportService } from "../../core/services/export";
import { ToastContainer } from "../../shared/components/toast-container/toast-container";
import { RewindArchive } from "./rewind-archive/rewind-archive";
import { RewindDetail } from "./rewind-detail/rewind-detail";

@Component({
	selector: "app-rewind-host",
	imports: [RouterOutlet, ToastContainer],
	template: `<router-outlet /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class RewindHost {}

const api = environment.apiUrl;
const NETWORK_ERROR = 0;
const rewindUrlPattern = /\/users\/([^/]+)\/rewinds\/(\d+)$/;
const storyUrlPattern = /\/users\/([^/]+)\/rewinds\/(\d+)\/story\.png$/;

function rewindFor(year: number, otherYears: number[]): Rewind {
	const hades = {
		gameId: `hades-${year}`,
		code: "hades",
		title: `Hades ${year}`,
		coverUrl: null,
		backgroundUrl: null,
		finishedAt: `${year}-03-04T00:00:00.000Z`,
		platformAbbreviation: "PS5"
	};
	return {
		year,
		user: { username: "ada", name: "Ada", avatarUrl: null, role: "user" },
		isSpotlight: false,
		otherYears,
		totals: {
			finished: 18,
			abandoned: 4,
			started: 23,
			hoursPlayed: 212.5,
			platinums: null
		},
		finishedGames: [hades],
		highlights: {
			topRated: { ...hades, userRating: 5 },
			bestRatio: null,
			longest: null,
			fastest: null,
			favoriteGenre: null,
			topPlatform: null,
			busiestMonth: { month: 3, count: 1 }
		}
	};
}

function summaryFor(year: number): RewindYearSummary {
	return {
		year,
		finishedCount: 18,
		startedCount: 23,
		hoursPlayed: 212.5,
		covers: []
	};
}

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("Rewind interaction", () => {
	let httpTesting: HttpTestingController;
	let parked: TestRequest[];
	let availableYears: number[];
	let rewindFailures: Map<number, { status: number; type?: string }>;
	let storyFailures: number[];
	let holdRewinds: boolean;
	let holdStories: boolean;
	let saveFile: ReturnType<typeof vi.fn>;
	let revokeObjectURL: ReturnType<typeof vi.fn>;
	let share: ReturnType<typeof vi.fn> | undefined;

	function fail(req: TestRequest, status: number, type?: string) {
		if (status === NETWORK_ERROR)
			return req.error(new ProgressEvent("error"));
		const body =
			req.request.responseType === "blob"
				? new Blob([JSON.stringify({ type })], {
						type: "application/json"
					})
				: { type };
		return req.flush(body, { status, statusText: "Error" });
	}

	function answerRewind(req: TestRequest, year: number) {
		const failure = rewindFailures.get(year);
		if (failure) return fail(req, failure.status, failure.type);
		if (!availableYears.includes(year))
			return fail(req, 404, "REWIND_NOT_FOUND");
		return req.flush({
			data: rewindFor(
				year,
				availableYears.filter(other => other !== year)
			)
		});
	}

	function answer(req: TestRequest) {
		const { method, url } = req.request;
		if (method !== "GET") throw new Error(`Unexpected request: ${url}`);
		if (url === `${api}/users/ada/rewinds`) {
			return req.flush({
				data: {
					spotlightYear: null,
					years: availableYears.map(summaryFor)
				}
			});
		}
		const story = storyUrlPattern.exec(url);
		if (story) {
			const failure = storyFailures.shift();
			if (failure !== undefined) return fail(req, failure);
			return req.flush(new Blob(["png"], { type: "image/png" }));
		}
		const rewind = rewindUrlPattern.exec(url);
		if (rewind) return answerRewind(req, Number(rewind[2]));
		throw new Error(`Unexpected request: ${url}`);
	}

	function isHeld(req: TestRequest) {
		const { url } = req.request;
		if (holdStories && storyUrlPattern.test(url)) return true;
		return holdRewinds && rewindUrlPattern.test(url);
	}

	function pendingRequests() {
		parked = [...parked, ...httpTesting.match(() => true)].filter(
			req => !req.cancelled
		);
		return parked;
	}

	function release(req: TestRequest) {
		parked = parked.filter(other => other !== req);
		return req;
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const ready = pendingRequests().filter(req => !isHeld(req));
			if (ready.length === 0) return;
			ready.forEach(req => answer(release(req)));
		}
	}

	function heldRequest(pattern: RegExp, year: number) {
		return pendingRequests().find(req => {
			const match = pattern.exec(req.request.url);
			return match && Number(match[2]) === year;
		});
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function renderAt(url: string) {
		const { fixture } = await render(RewindHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()],
			routes: [
				{
					path: "user/:username/rewind/:year",
					component: RewindDetail
				},
				{ path: "user/:username/rewind", component: RewindArchive },
				{ path: "user/:username", children: [] },
				{ path: "games/:code", children: [] },
				{ path: "users", children: [] }
			],
			initialRoute: url
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		saveFile = vi
			.spyOn(TestBed.inject(ExportService), "saveFile")
			.mockImplementation(() => undefined) as unknown as ReturnType<
			typeof vi.fn
		>;
		return fixture;
	}

	async function renderRewind(year = 2026) {
		const fixture = await renderAt(`/user/ada/rewind/${year}`);
		await untilVisible(() =>
			expect(
				screen.getByRole("heading", {
					level: 1,
					name: /2026|2025|2024/
				})
			).toBeInTheDocument()
		);
		return fixture;
	}

	function shareSection() {
		return screen.getByRole("region", { name: "Share" });
	}

	async function shareActions() {
		await untilVisible(() =>
			expect(
				within(shareSection()).getByRole("button", {
					name: "Download image"
				})
			).toBeInTheDocument()
		);
		return shareSection();
	}

	async function shareActionsWithImage() {
		const section = await shareActions();
		await untilVisible(() =>
			expect(within(section).getByRole("img")).toBeInTheDocument()
		);
		return section;
	}

	beforeEach(() => {
		availableYears = [2026, 2025, 2024];
		parked = [];
		rewindFailures = new Map();
		storyFailures = [];
		holdRewinds = false;
		holdStories = false;
		share = undefined;
		vi.spyOn(performance, "now").mockReturnValue(1000);
		vi.stubGlobal(
			"matchMedia",
			vi.fn((query: string) => ({
				matches: query.includes("prefers-reduced-motion"),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				constructor(
					private readonly callback: IntersectionObserverCallback
				) {}
				observe(target: Element) {
					queueMicrotask(() =>
						this.callback(
							[
								{
									isIntersecting: true,
									intersectionRatio: 1,
									target
								} as unknown as IntersectionObserverEntry
							],
							this as unknown as IntersectionObserver
						)
					);
				}
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		let objectUrlCount = 0;
		revokeObjectURL = vi.fn();
		URL.createObjectURL = vi.fn(() => `blob:story-${++objectUrlCount}`);
		URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;
	});

	function enableWebShare(implementation: () => Promise<void>) {
		share = vi.fn(implementation);
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: share
		});
		Object.defineProperty(navigator, "canShare", {
			configurable: true,
			value: vi.fn(() => true)
		});
	}

	afterEach(() => {
		holdRewinds = false;
		holdStories = false;
		answerPending();
		httpTesting.verify();
		Reflect.deleteProperty(navigator, "share");
		Reflect.deleteProperty(navigator, "canShare");
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe("detail page", () => {
		it("shows the results of the year from the summary down to the share preview", async () => {
			await renderRewind();

			expect(
				screen.getByRole("heading", {
					level: 1,
					name: "@ada's Rewind 2026"
				})
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"18 games finished, 4 left behind and 23 started."
				)
			).toBeInTheDocument();
			const results = screen.getByRole("region", { name: "Results" });
			expect(
				within(results).getByText("Left behind")
			).toBeInTheDocument();
			expect(
				within(results).getByText("212.5", { selector: ".sr-only" })
			).toBeInTheDocument();
			expect(
				within(results).queryByText("Platinums")
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /Top rated.*Hades 2026/ })
			).toHaveAttribute("href", "/games/hades");
			await shareActions();
			await untilVisible(() =>
				expect(
					within(shareSection()).getByRole("img", {
						name: "@ada's 2026 Rewind"
					})
				).toHaveAttribute("src", "blob:story-1")
			);
			expect(
				screen.getByRole("region", { name: "Finished in 2026" })
			).toBeInTheDocument();
		});

		it("switches years from the picker with real links", async () => {
			const user = userEvent.setup();
			await renderRewind();

			await user.click(
				screen.getByRole("button", { name: "Year: 2026" })
			);
			await user.click(
				within(screen.getByRole("menu")).getByRole("menuitem", {
					name: /2024/
				})
			);

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", { level: 1, name: /2024/ })
				).toBeInTheDocument()
			);
			expect(TestBed.inject(Router).url).toBe("/user/ada/rewind/2024");
		});

		it("never shows an older year when the user jumps between years and answers arrive out of order", async () => {
			await renderRewind();
			const router = TestBed.inject(Router);
			holdRewinds = true;

			await router.navigateByUrl("/user/ada/rewind/2025");
			await waitFor(() =>
				expect(
					screen.getByLabelText("Loading Rewind")
				).toBeInTheDocument()
			);
			expect(screen.queryByText("Hades 2026")).not.toBeInTheDocument();
			await router.navigateByUrl("/user/ada/rewind/2024");
			await waitFor(() =>
				expect(heldRequest(rewindUrlPattern, 2024)).toBeDefined()
			);
			answer(release(heldRequest(rewindUrlPattern, 2024)!));
			const stale = heldRequest(rewindUrlPattern, 2025);
			if (stale) answer(release(stale));
			holdRewinds = false;

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", { level: 1, name: /2024/ })
				).toBeInTheDocument()
			);
			expect(screen.queryByText(/Hades 2025/)).not.toBeInTheDocument();
		});

		it("opens a single Share dialog on a double click and closes it while the image is still loading", async () => {
			const user = userEvent.setup();
			holdStories = true;
			await renderRewind();

			await user.dblClick(screen.getByRole("button", { name: "Share" }));

			const dialogs = await screen.findAllByRole("dialog", {
				name: "Share"
			});
			expect(dialogs).toHaveLength(1);
			await user.click(
				within(dialogs[0]).getByRole("button", {
					name: "Download image"
				})
			);
			expect(
				within(dialogs[0]).getByRole("button", {
					name: "Download image"
				})
			).toHaveAttribute("aria-busy", "true");

			await user.click(
				screen.getByRole("button", { name: "Close Share" })
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			);
			holdStories = false;
			await shareActionsWithImage();

			expect(saveFile).not.toHaveBeenCalled();
		});

		it("downloads the image once per double click with the expected file name", async () => {
			const user = userEvent.setup();
			await renderRewind();
			const section = await shareActionsWithImage();

			await user.dblClick(
				within(section).getByRole("button", { name: "Download image" })
			);

			expect(saveFile).toHaveBeenCalledTimes(1);
			expect(saveFile).toHaveBeenCalledWith(
				expect.any(Blob),
				"completr-rewind-ada-2026.png"
			);
		});

		it("waits for the image when Download is pressed early and still downloads it only once", async () => {
			const user = userEvent.setup();
			holdStories = true;
			await renderRewind();
			const section = await shareActions();
			const download = within(section).getByRole("button", {
				name: "Download image"
			});

			await user.dblClick(download);
			expect(saveFile).not.toHaveBeenCalled();
			holdStories = false;

			await untilVisible(() => expect(saveFile).toHaveBeenCalledTimes(1));
			expect(download).not.toHaveAttribute("aria-busy");
		});

		it("lets the user retry when the image fails to load", async () => {
			const user = userEvent.setup();
			storyFailures.push(500);
			await renderRewind();
			const section = await shareActions();

			await untilVisible(() =>
				expect(
					within(section).getByText("Couldn't load the image.")
				).toBeInTheDocument()
			);
			await user.click(
				within(section).getByRole("button", { name: "Try again" })
			);

			await untilVisible(() =>
				expect(within(section).getByRole("img")).toBeInTheDocument()
			);
		});

		it("copies the share link once on a double click", async () => {
			const user = userEvent.setup();
			await renderRewind();

			await user.dblClick(
				within(shareSection()).getByRole("button", {
					name: "Copy link"
				})
			);

			expect(await screen.findAllByText("Link copied")).toHaveLength(1);
			expect(await navigator.clipboard.readText()).toBe(
				`${api}/share/rewind/ada/2026`
			);
		});

		it("hides Share image when the browser cannot share files", async () => {
			await renderRewind();
			const section = await shareActions();

			expect(
				within(section).queryByRole("button", {
					name: "Share image"
				})
			).not.toBeInTheDocument();
			expect(
				within(section).getByRole("button", {
					name: "Download image"
				})
			).toBeInTheDocument();
		});

		it("shares the image once and stays quiet when the user cancels the share sheet", async () => {
			const user = userEvent.setup();
			enableWebShare(() =>
				Promise.reject(new DOMException("cancelled", "AbortError"))
			);
			await renderRewind();
			const section = await shareActionsWithImage();

			await user.dblClick(
				within(section).getByRole("button", { name: "Share image" })
			);

			expect(share).toHaveBeenCalledTimes(1);
			const [payload] = share!.mock.calls[0] as [ShareData];
			expect(payload.files?.[0].name).toBe(
				"completr-rewind-ada-2026.png"
			);
			expect(payload.files?.[0].type).toBe("image/png");
			await new Promise(resolve => setTimeout(resolve, 20));
			expect(
				screen.queryByText(
					"Couldn't share the image. Download it instead."
				)
			).not.toBeInTheDocument();
		});

		it("suggests downloading when sharing fails for another reason", async () => {
			const user = userEvent.setup();
			enableWebShare(() => Promise.reject(new Error("NotAllowedError")));
			await renderRewind();
			const section = await shareActionsWithImage();

			await user.click(
				within(section).getByRole("button", { name: "Share image" })
			);

			expect(
				await screen.findByText(
					"Couldn't share the image. Download it instead."
				)
			).toBeInTheDocument();
		});

		it("releases the preview image when the user leaves the page", async () => {
			const fixture = await renderRewind();
			await shareActionsWithImage();

			fixture.destroy();

			expect(revokeObjectURL).toHaveBeenCalledWith("blob:story-1");
		});
	});

	describe("detail errors", () => {
		it.each(["abc", "1999", "2101", "2026.5"])(
			"explains the Rewind is not available for the junk year %s without asking the API",
			async year => {
				await renderAt(`/user/ada/rewind/${year}`);

				expect(
					await screen.findByRole("heading", {
						name: "This Rewind isn't available"
					})
				).toBeInTheDocument();
				expect(pendingRequests()).toHaveLength(0);
			}
		);

		it("explains when the year has no Rewind and links to all of them", async () => {
			await renderAt("/user/ada/rewind/2023");

			await untilVisible(() =>
				expect(
					screen.getByText(
						"Rewinds open on December 1 and only exist for years with games started or finished."
					)
				).toBeInTheDocument()
			);
			expect(
				screen.getByRole("link", { name: "See all Rewinds" })
			).toHaveAttribute("href", "/user/ada/rewind");
		});

		it("says the player does not exist", async () => {
			rewindFailures.set(2026, { status: 404, type: "USER_NOT_FOUND" });
			await renderAt("/user/ada/rewind/2026");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", { name: "Player not found" })
				).toBeInTheDocument()
			);
		});

		it("says the Rewind is private", async () => {
			rewindFailures.set(2026, { status: 403, type: "USER_PRIVATE" });
			await renderAt("/user/ada/rewind/2026");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", {
						name: "This Rewind is private"
					})
				).toBeInTheDocument()
			);
		});

		it.each([
			["a server error", 500],
			["a network error", NETWORK_ERROR]
		])("recovers from %s with Try again", async (_, status) => {
			const user = userEvent.setup();
			rewindFailures.set(2026, { status });
			await renderAt("/user/ada/rewind/2026");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", {
						name: "Couldn't load this Rewind"
					})
				).toBeInTheDocument()
			);
			rewindFailures.clear();
			await user.click(screen.getByRole("button", { name: "Try again" }));

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", { level: 1, name: /2026/ })
				).toBeInTheDocument()
			);
		});
	});

	describe("archive", () => {
		it("lists every year as a link to its Rewind", async () => {
			await renderAt("/user/ada/rewind");

			await untilVisible(() =>
				expect(screen.getAllByRole("listitem")).toHaveLength(3)
			);
			expect(
				screen.getByText("Every year @ada has played, one page each.")
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /2024/ })).toHaveAttribute(
				"href",
				"/user/ada/rewind/2024"
			);
		});

		it("says the Rewinds are private", async () => {
			const user = userEvent.setup();
			await renderAt("/user/ada/rewind");
			await waitFor(() => expect(pendingRequests()).toHaveLength(1));
			fail(release(pendingRequests()[0]), 403, "USER_PRIVATE");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", {
						name: "These Rewinds are private"
					})
				).toBeInTheDocument()
			);
			await user.click(
				screen.getByRole("link", { name: "Back to profile" })
			);
			expect(TestBed.inject(Router).url).toBe("/user/ada");
		});

		it("explains when there are no Rewinds yet", async () => {
			availableYears = [];
			await renderAt("/user/ada/rewind");

			await untilVisible(() =>
				expect(
					screen.getByRole("heading", { name: "No Rewinds yet" })
				).toBeInTheDocument()
			);
			expect(
				screen.getByText(
					"A Rewind appears once a year has games started or finished."
				)
			).toBeInTheDocument();
		});
	});
});
