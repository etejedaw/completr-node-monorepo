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

function chipText(element: Element) {
	const copy = element.cloneNode(true) as Element;
	copy.querySelectorAll("[aria-hidden='true'], button").forEach(hidden =>
		hidden.remove()
	);
	return copy.textContent?.replace(/\s+/g, " ").trim();
}

function chip(text: string) {
	return screen.queryByText(
		(_, element) => element?.tagName === "LI" && chipText(element) === text
	);
}

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
		aiRecapState: "unavailable",
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
		premiumAccess: { allowed: true, source: "role", expiresAt: null },
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

		expect(chip("1 AI generation left")).toBeInTheDocument();
		expect(screen.getByText("+1 extra until Jan 7")).toBeInTheDocument();
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
					includesNotes: true,
					aiRecapState: "failed"
				})
			})
		);

		expect(screen.getByRole("region")).toHaveAttribute("lang", "es");
		expect(chip("0 generaciones con IA restantes")).toBeInTheDocument();
		expect(
			screen.getByText("+1 extra hasta el 7 de enero")
		).toBeInTheDocument();
		expect(screen.getByText("En español")).toBeInTheDocument();
		expect(screen.getByText("Incluye runs privadas")).toBeInTheDocument();
		expect(screen.getByText("Usa tus notas")).toBeInTheDocument();
		expect(screen.queryByText("Solo runs públicas")).toBeNull();
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

	it("says the recap uses the notes only when the owner opted in", async () => {
		const { fixture } = await renderPanel(
			rewindFixture({ ownerControls: controls() })
		);

		expect(screen.queryByText("Uses your notes")).toBeNull();
		expect(screen.queryByText("Includes private runs")).toBeNull();
		expect(screen.getByText("In English")).toBeInTheDocument();
		expect(screen.getByText("Public runs only")).toBeInTheDocument();

		fixture.componentRef.setInput(
			"rewind",
			rewindFixture({ ownerControls: controls({ includesNotes: true }) })
		);
		fixture.detectChanges();

		expect(await screen.findByText("Uses your notes")).toBeInTheDocument();
		expect(screen.queryByText("Includes private runs")).toBeNull();
	});

	it("hides Regenerate when no regeneration is possible", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({
					regenerationsLeft: 0,
					canRegenerate: false,
					regenerationBlockedBy: "no-regenerations-left"
				})
			})
		);

		expect(chip("0 AI generations left")).toBeInTheDocument();
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

	it("shows Add AI recap to a free role when a feature grant makes it available", async () => {
		isPremium.set(false);
		await renderPanel(
			rewindFixture({
				user: {
					username: "ada",
					name: "Ada",
					avatarUrl: null,
					role: "user"
				},
				premiumAccess: {
					allowed: true,
					source: "feature-grant",
					expiresAt: "2027-01-31T23:59:59.999Z"
				},
				ownerControls: controls({ aiRecapState: "available" })
			})
		);

		expect(
			screen.getByRole("button", { name: "Add AI recap" })
		).toBeInTheDocument();
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
			includeNotes: false,
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
	describe("edition period and AI access", () => {
		const giftOffersUrl = `${api}/users/me/gift-offers`;
		const noAccess = { allowed: false, source: null, expiresAt: null };

		function giftOffer() {
			return {
				code: "rewind-gift",
				feature: "rewind.premium",
				availableFrom: "2026-12-01T00:00:00.000Z",
				availableUntil: "2099-01-31T23:59:59.999Z",
				status: "available",
				expiresAt: null,
				canActivate: true,
				hasAccess: false
			};
		}

		it("marks the AI generations as premium with the label of the owner's access", async () => {
			const { fixture } = await renderPanel(rewindFixture());

			expect(
				screen.getByRole("button", { name: "Premium" })
			).toBeInTheDocument();

			fixture.componentRef.setInput(
				"rewind",
				rewindFixture({
					language: "es",
					premiumAccess: {
						allowed: true,
						source: "feature-grant",
						expiresAt: "2027-01-31T23:59:59.999Z"
					}
				})
			);
			fixture.detectChanges();

			expect(
				await screen.findByRole("button", { name: "Regalo" })
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Premium" })
			).toBeNull();
		});

		it("does not show the AI generations tile without AI access", async () => {
			await renderPanel(
				rewindFixture({
					premiumAccess: noAccess,
					ownerControls: controls({
						canRegenerate: false,
						regenerationBlockedBy: "no-ai-access"
					})
				})
			);
			http()
				.expectOne(giftOffersUrl)
				.flush({ data: { offers: [] } });

			expect(
				screen.queryByRole("button", { name: "Premium" })
			).toBeNull();
			expect(screen.queryByRole("button", { name: "Gift" })).toBeNull();
			expect(screen.queryByText("AI generations")).toBeNull();
			expect(screen.queryByText(/AI generations?: /)).toBeNull();
			expect(chip("Open until Jan 31")).toBeInTheDocument();
			expect(chip("In English")).toBeInTheDocument();
		});

		it("hides Regenerate and the AI generations without AI access and shows the Rewind gift instead", async () => {
			await renderPanel(
				rewindFixture({
					premiumAccess: noAccess,
					ownerControls: controls({
						regenerationsLeft: 2,
						canRegenerate: false,
						regenerationBlockedBy: "no-ai-access",
						aiRecapState: "failed"
					})
				})
			);

			http()
				.expectOne(giftOffersUrl)
				.flush({ data: { offers: [giftOffer()] } });

			expect(
				screen.queryByRole("button", { name: "Regenerate" })
			).toBeNull();
			expect(screen.queryByText(/AI generations? left/)).toBeNull();
			expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
			expect(
				await screen.findByRole("button", { name: /Claim|Activate/ })
			).toBeInTheDocument();
		});

		it("shows how many AI generations are left and the grace in Spanish with access", async () => {
			await renderPanel(
				rewindFixture({
					language: "es",
					ownerControls: controls({
						regenerationsLeft: 3,
						graceEndsAt: "2027-01-07"
					})
				})
			);

			expect(chip("3 generaciones con IA restantes")).toBeInTheDocument();
			expect(
				screen.getByText("+1 extra hasta el 7 de enero")
			).toBeInTheDocument();
			expect(screen.getByText("Abierta")).toBeInTheDocument();
			expect(
				screen.getByText("hasta el 31 de enero")
			).toBeInTheDocument();
			http().expectNone(giftOffersUrl);
		});

		it("says Closed and the date of the final version once the period is over", async () => {
			await renderPanel(
				rewindFixture({
					frozenAt: "2027-02-01T00:03:00.000Z",
					ownerControls: controls({
						periodOpen: false,
						periodStatus: "closed",
						closesAt: null,
						frozenAt: "2027-02-01T00:03:00.000Z",
						canRegenerate: false,
						regenerationBlockedBy: "period-closed",
						aiRecapState: "failed",
						regenerationsLeft: 2
					})
				})
			);

			expect(screen.getByText("Closed")).toBeInTheDocument();
			expect(
				screen.getByText("Final version from Feb 1, 2027")
			).toBeInTheDocument();
			expect(screen.queryByText(/AI generations? left/)).toBeNull();
			expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Regenerate" })
			).toBeNull();
			http().expectNone(giftOffersUrl);
		});

		it("says Cerrado without a date while the Rewind waits to be frozen", async () => {
			await renderPanel(
				rewindFixture({
					language: "es",
					premiumAccess: noAccess,
					ownerControls: controls({
						periodOpen: false,
						periodStatus: "closed",
						closesAt: null,
						canRegenerate: false,
						regenerationBlockedBy: "period-closed"
					})
				})
			);

			expect(screen.getByText("Cerrado")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Este Rewind ya no se puede generar ni regenerar."
				)
			).toBeInTheDocument();
			http().expectNone(giftOffersUrl);
		});

		it("says the next season is not open yet while it is scheduled, in both languages", async () => {
			const { fixture } = await renderPanel(
				rewindFixture({
					ownerControls: controls({
						periodOpen: false,
						periodStatus: "scheduled",
						closesAt: null,
						canRegenerate: false,
						regenerationBlockedBy: "period-closed"
					})
				})
			);

			expect(screen.getByText("Not open yet")).toBeInTheDocument();
			expect(
				screen.getByText(/The next Rewind season hasn't opened yet/)
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Regenerate" })
			).toBeNull();

			fixture.componentRef.setInput(
				"rewind",
				rewindFixture({
					language: "es",
					ownerControls: controls({
						periodOpen: false,
						periodStatus: "scheduled",
						closesAt: null,
						canRegenerate: false,
						regenerationBlockedBy: "period-closed"
					})
				})
			);
			fixture.detectChanges();
			expect(await screen.findByText("Aún no abre")).toBeInTheDocument();
		});

		it("does not tell a user without AI access what Premium would add", async () => {
			await renderPanel(
				rewindFixture({
					premiumAccess: noAccess,
					ownerControls: controls({
						canRegenerate: false,
						regenerationBlockedBy: "no-ai-access"
					})
				})
			);
			http()
				.expectOne(giftOffersUrl)
				.flush({ data: { offers: [] } });

			expect(screen.queryByText(/Premium/)).toBeNull();
			expect(
				screen.queryByText(
					"Regenerating needs Premium or a Rewind gift."
				)
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Regenerate" })
			).toBeNull();
		});

		it("does not repeat the reason when the panel already says it", async () => {
			const { fixture } = await renderPanel(
				rewindFixture({
					ownerControls: controls({
						regenerationsLeft: 0,
						canRegenerate: false,
						regenerationBlockedBy: "no-regenerations-left"
					})
				})
			);

			expect(chip("0 AI generations left")).toBeInTheDocument();
			expect(
				screen.queryByText(
					"You've used every AI generation for this Rewind."
				)
			).toBeNull();

			fixture.componentRef.setInput(
				"rewind",
				rewindFixture({
					ownerControls: controls({
						periodOpen: false,
						periodStatus: "closed",
						canRegenerate: false,
						regenerationBlockedBy: "period-closed"
					})
				})
			);
			fixture.detectChanges();
			expect(screen.getByText("Closed")).toBeInTheDocument();
			expect(
				screen.queryByText(
					"Regenerating only works during the Rewind season."
				)
			).toBeNull();
		});

		it("shows only the latest reason when the Rewind changes quickly, in its language", async () => {
			const { fixture } = await renderPanel(rewindFixture());
			const sequence = [
				controls({
					canRegenerate: false,
					regenerationBlockedBy: "requires-premium"
				}),
				controls(),
				controls({
					canRegenerate: false,
					regenerationBlockedBy: "requires-premium"
				})
			];
			for (const ownerControls of sequence) {
				fixture.componentRef.setInput(
					"rewind",
					rewindFixture({ language: "es", ownerControls })
				);
				fixture.detectChanges();
			}

			expect(
				screen.getAllByText(
					"Los Rewinds de años anteriores solo se regeneran con Premium."
				)
			).toHaveLength(1);
			expect(
				screen.queryByRole("button", { name: "Regenerar" })
			).toBeNull();

			fixture.componentRef.setInput("rewind", rewindFixture());
			fixture.detectChanges();
			expect(
				screen.getByRole("button", { name: "Regenerate" })
			).toBeInTheDocument();
			expect(
				screen.queryByText(/only be regenerated with Premium/)
			).toBeNull();
		});

		it("does not guess a Premium reason from the counters when the API sends none", async () => {
			await renderPanel(
				rewindFixture({
					ownerControls: controls({
						regenerationsLeft: 2,
						graceEndsAt: null,
						canRegenerate: true,
						regenerationBlockedBy: null
					})
				})
			);

			expect(
				screen.queryByText(/only be regenerated with Premium/)
			).toBeNull();
			expect(
				screen.getByRole("button", { name: "Regenerate" })
			).toBeInTheDocument();
		});

		it("trusts periodStatus over the older periodOpen flag", async () => {
			await renderPanel(
				rewindFixture({
					ownerControls: controls({
						periodOpen: true,
						periodStatus: "closed",
						aiRecapState: "available",
						canRegenerate: false,
						regenerationBlockedBy: "period-closed"
					})
				})
			);

			expect(screen.getByText("Closed")).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Add AI recap" })
			).toBeNull();
		});

		it("explains that a previous year needs Premium when a gift cannot regenerate it", async () => {
			await renderPanel(
				rewindFixture({
					year: 2025,
					premiumAccess: {
						allowed: true,
						source: "feature-grant",
						expiresAt: null
					},
					ownerControls: controls({
						regenerationsLeft: 1,
						canRegenerate: false,
						regenerationBlockedBy: "requires-premium"
					})
				})
			);

			expect(
				screen.getByText(
					"Rewinds of previous years can only be regenerated with Premium."
				)
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Regenerate" })
			).toBeNull();
		});

		it.each([
			[
				409,
				"REWIND_PERIOD_CLOSED",
				"This Rewind is closed, so its AI recap can't be added anymore."
			],
			[
				403,
				"REWIND_YEAR_REQUIRES_PREMIUM",
				"AI recaps for previous years need Premium."
			],
			[
				409,
				"REWIND_REGENERATION_LIMIT",
				"You've used every AI generation for this Rewind."
			]
		])(
			"explains a %s %s on Add AI recap and reloads the Rewind",
			async (status, type, message) => {
				await renderPanel(
					rewindFixture({
						ownerControls: controls({ aiRecapState: "available" })
					})
				);
				await userEvent.dblClick(
					screen.getByRole("button", { name: "Add AI recap" })
				);

				const requests = http().match(aiRecapUrl);
				expect(requests).toHaveLength(1);
				requests[0].flush({ type }, { status, statusText: "err" });
				const reloaded = rewindFixture({
					ownerControls: controls({
						periodOpen: type !== "REWIND_PERIOD_CLOSED",
						periodStatus:
							type === "REWIND_PERIOD_CLOSED" ? "closed" : "open",
						canRegenerate: false,
						regenerationBlockedBy:
							type === "REWIND_PERIOD_CLOSED"
								? "period-closed"
								: type === "REWIND_YEAR_REQUIRES_PREMIUM"
									? "requires-premium"
									: "no-regenerations-left"
					})
				});
				http().expectOne(rewindUrl).flush({ data: reloaded });

				expect(await screen.findByText(message)).toBeInTheDocument();
				expect(changes).toEqual([reloaded]);
			}
		);
	});
});
