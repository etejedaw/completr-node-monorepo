import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal, type WritableSignal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../../environments/environment";
import {
	type Rewind,
	type RewindOwnerControls
} from "../../../../core/models/rewind.model";
import { AuthService } from "../../../../core/services/auth";
import { ToastService } from "../../../../core/services/toast";
import { RewindOwnerPanel } from "./rewind-owner-panel";

const api = environment.apiUrl;
const aiRecapUrl = `${api}/users/me/rewinds/2026/ai-recap`;
const rewindUrl = `${api}/users/ada/rewinds/2026`;

function controls(
	overrides: Partial<RewindOwnerControls> = {}
): RewindOwnerControls {
	return {
		includesPrivateRuns: false,
		regenerationsLeft: 1,
		graceEndsAt: null,
		canRegenerate: true,
		aiRecapState: "unavailable",
		...overrides
	};
}

function rewindFixture(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: 2026,
		user: {
			username: "ada",
			name: "Ada",
			avatarUrl: null,
			role: "premium"
		},
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: controls(),
		...overrides
	} as Rewind;
}

describe("RewindOwnerPanel", () => {
	let isPremium: WritableSignal<boolean>;
	let changes: Rewind[];

	async function renderPanel(rewind: Rewind) {
		const result = await render(RewindOwnerPanel, {
			inputs: { rewind },
			on: { rewindChange: (value: Rewind) => changes.push(value) },
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: { isPremium } },
				{
					provide: ToastService,
					useValue: { pending: vi.fn(), error: vi.fn() }
				}
			]
		});
		return result;
	}

	function http() {
		return TestBed.inject(HttpTestingController);
	}

	beforeEach(() => {
		isPremium = signal(true);
		changes = [];
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
		http().verify();
	});

	it("renders nothing for someone who isn't the owner", async () => {
		const { container } = await renderPanel(
			rewindFixture({ ownerControls: null })
		);

		expect(container.textContent?.trim()).toBe("");
	});

	it("shows the regenerations left and the grace window in English", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ graceEndsAt: "2027-01-07" })
			})
		);

		expect(screen.getByText("1 regeneration left")).toBeInTheDocument();
		expect(
			screen.getByText("Extra regeneration available until Jan 7")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Regenerate" })
		).toBeInTheDocument();
	});

	it("speaks Spanish when the Rewind was generated in Spanish", async () => {
		await renderPanel(
			rewindFixture({
				language: "es",
				ownerControls: controls({
					regenerationsLeft: 0,
					graceEndsAt: "2027-01-07",
					includesPrivateRuns: true,
					aiRecapState: "failed"
				})
			})
		);

		expect(screen.getByRole("region")).toHaveAttribute("lang", "es");
		expect(
			screen.getByText("No te quedan regeneraciones")
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Regeneración extra disponible hasta el 7 de enero"
			)
		).toBeInTheDocument();
		expect(screen.getByText("Incluye runs privadas")).toBeInTheDocument();
		expect(
			screen.getByText("No se pudo generar el resumen con IA")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Reintentar" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Regenerar" })
		).toBeInTheDocument();
	});

	it("hides Regenerate when no regeneration is possible", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({
					regenerationsLeft: 0,
					canRegenerate: false
				})
			})
		);

		expect(
			screen.getByText("No regular regenerations left")
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
	});

	it.each(["ready", "unavailable"] as const)(
		"says nothing about the AI recap when it is %s",
		async aiRecapState => {
			await renderPanel(
				rewindFixture({ ownerControls: controls({ aiRecapState }) })
			);

			expect(screen.queryByText(/AI recap/)).toBeNull();
			expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
		}
	);

	it("retries a failed AI recap with a single request on a double click", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "failed" })
			})
		);

		await userEvent.dblClick(screen.getByRole("button", { name: "Retry" }));

		const requests = http().match(aiRecapUrl);
		expect(requests).toHaveLength(1);
		expect(requests[0].request.method).toBe("POST");
		const updated = rewindFixture({
			ownerControls: controls({ aiRecapState: "ready" })
		});
		requests[0].flush({ data: updated });
		expect(changes).toEqual([updated]);
	});

	it("offers a golden Add AI recap with the spark icon and sends one request on a triple click", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);
		const add = screen.getByRole("button", { name: "Add AI recap" });

		expect(add).toHaveTextContent("auto_awesome");
		await userEvent.tripleClick(add);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Writing your AI recap"
		);
		const requests = http().match(aiRecapUrl);
		expect(requests).toHaveLength(1);
		requests[0].flush({ data: rewindFixture() });
	});

	it("never shows Add AI recap to an owner who isn't premium anymore", async () => {
		isPremium.set(false);
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);

		expect(
			screen.queryByRole("button", { name: "Add AI recap" })
		).toBeNull();
	});

	it("explains a lost premium and reloads the Rewind", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "failed" })
			})
		);
		await userEvent.click(screen.getByRole("button", { name: "Retry" }));

		http()
			.expectOne(aiRecapUrl)
			.flush(
				{ type: "REWIND_AI_RECAP_PREMIUM_REQUIRED" },
				{ status: 402, statusText: "Payment Required" }
			);
		const reloaded = rewindFixture();
		http().expectOne(rewindUrl).flush({ data: reloaded });

		expect(
			await screen.findByText("Adding an AI recap needs Premium.")
		).toBeInTheDocument();
		expect(changes).toEqual([reloaded]);
	});

	it("loads the existing AI recap when another tab already added it", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Add AI recap" })
		);

		http()
			.expectOne(aiRecapUrl)
			.flush(
				{ type: "REWIND_AI_RECAP_EXISTS" },
				{ status: 409, statusText: "Conflict" }
			);
		const reloaded = rewindFixture({
			ownerControls: controls({ aiRecapState: "ready" })
		});
		http().expectOne(rewindUrl).flush({ data: reloaded });

		expect(
			await screen.findByText(
				"Your AI recap was already added. We loaded it."
			)
		).toBeInTheDocument();
		expect(changes).toEqual([reloaded]);
	});

	it.each([
		[
			409,
			"REWIND_AI_RECAP_IN_PROGRESS",
			"Your AI recap is already being written. Check back in a minute."
		],
		[
			503,
			"REWIND_AI_RECAP_FAILED",
			"The AI recap couldn't be written right now. Try again in a few minutes."
		],
		[
			429,
			"TOO_MANY_REQUESTS",
			"Too many attempts. Wait a moment and try again."
		]
	])(
		"shows the %s %s error and lets the owner retry",
		async (status, type, message) => {
			await renderPanel(
				rewindFixture({
					ownerControls: controls({ aiRecapState: "failed" })
				})
			);
			await userEvent.click(
				screen.getByRole("button", { name: "Retry" })
			);

			http()
				.expectOne(aiRecapUrl)
				.flush({ type }, { status, statusText: "Error" });

			expect(await screen.findByText(message)).toBeInTheDocument();
			expect(changes).toEqual([]);
			await userEvent.click(
				screen.getByRole("button", { name: "Retry" })
			);
			http().expectOne(aiRecapUrl).flush({ data: rewindFixture() });
			await waitFor(() => expect(changes).toHaveLength(1));
			expect(screen.queryByText(message)).toBeNull();
		}
	);

	it("explains a network error in the Rewind language", async () => {
		await renderPanel(
			rewindFixture({
				language: "es",
				ownerControls: controls({ aiRecapState: "failed" })
			})
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Reintentar" })
		);

		http().expectOne(aiRecapUrl).error(new ProgressEvent("error"));

		expect(
			await screen.findByText(
				"Parece que no tienes conexión. Revísala y vuelve a intentarlo."
			)
		).toBeInTheDocument();
	});

	it("does not emit when the panel is gone before the AI recap arrives", async () => {
		const { fixture } = await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "failed" })
			})
		);
		await userEvent.click(screen.getByRole("button", { name: "Retry" }));

		fixture.destroy();
		http().expectOne(aiRecapUrl).flush({ data: rewindFixture() });

		expect(changes).toEqual([]);
	});

	it("regenerates from the dialog with the current values and emits the new Rewind", async () => {
		await renderPanel(
			rewindFixture({
				language: "es",
				ownerControls: controls({ includesPrivateRuns: true })
			})
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Regenerar" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Regenerate your 2026 Rewind"
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const request = http().expectOne(`${api}/users/me/rewinds/2026`);
		expect(request.request.body).toEqual({
			language: "es",
			includePrivateRuns: true,
			expectedGeneratedAt: "2026-12-02T10:00:00.000Z"
		});
		const regenerated = rewindFixture({
			generatedAt: "2026-12-05T10:00:00.000Z"
		});
		request.flush({ data: regenerated });

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", {
					name: "Regenerate your 2026 Rewind"
				})
			).toBeNull()
		);
		expect(changes).toEqual([regenerated]);
	});
});
