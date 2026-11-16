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
const generateUrl = `${api}/users/me/rewinds/2026`;
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
					useValue: {
						pending: vi.fn(),
						error: vi.fn(),
						premium: vi.fn()
					}
				}
			]
		});
		return result;
	}

	function http() {
		return TestBed.inject(HttpTestingController);
	}

	async function openGenerator(trigger: string) {
		await userEvent.click(screen.getByRole("button", { name: trigger }));
		return screen.findByRole("dialog", {
			name: "Regenerate your 2026 Rewind"
		});
	}

	function aiButtons() {
		return screen.queryAllByRole("button", {
			name: /^(Add AI recap|Regenerate|Retry|Rewinding…)$/
		});
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

	it("keeps the panel in English when the Rewind was generated in Spanish", async () => {
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

		expect(screen.getByRole("region")).not.toHaveAttribute("lang");
		expect(chip("0 AI generations left")).toBeInTheDocument();
		expect(screen.getByText("+1 extra until Jan 7")).toBeInTheDocument();
		expect(screen.getByText("In Spanish")).toBeInTheDocument();
		expect(screen.queryByText("In English")).toBeNull();
		expect(screen.getByText("Includes private runs")).toBeInTheDocument();
		expect(screen.getByText("Uses your notes")).toBeInTheDocument();
		expect(screen.queryByText("Public runs only")).toBeNull();
		expect(
			screen.getByText("AI recap couldn't be generated")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Retry" })
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
		expect(
			screen.queryByText(/generaciones|Reintentar|Regenerar/)
		).toBeNull();
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

	it("shows a disabled Regenerate with its reason when no AI generation is left", async () => {
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
		const regenerate = screen.getByRole("button", { name: "Regenerate" });
		expect(regenerate).toBeDisabled();
		expect(regenerate.parentElement).toHaveAttribute(
			"title",
			"You've used every AI generation for this Rewind."
		);
		expect(
			screen.getByText("You've used every AI generation for this Rewind.")
		).toBeInTheDocument();
		await userEvent.click(regenerate);
		expect(
			screen.queryByRole("dialog", {
				name: "Regenerate your 2026 Rewind"
			})
		).toBeNull();
	});

	it("does not show the used-up line while a generation is left", async () => {
		await renderPanel(rewindFixture());

		expect(
			screen.queryByText(
				"You've used every AI generation for this Rewind."
			)
		).toBeNull();
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

	it.each([
		["available", "Add AI recap", "auto_awesome"],
		["ready", "Regenerate", "refresh"],
		["unavailable", "Regenerate", "refresh"],
		["failed", "Retry", "refresh"]
	] as const)(
		"shows a single AI button when the recap is %s: %s",
		async (aiRecapState, label, icon) => {
			await renderPanel(
				rewindFixture({ ownerControls: controls({ aiRecapState }) })
			);

			const buttons = aiButtons();
			expect(buttons).toHaveLength(1);
			expect(buttons[0]).toHaveAccessibleName(label);
			expect(buttons[0]).toHaveTextContent(icon);
		}
	);

	it("opens the regenerate dialog from Add AI recap with the premium stats line and regenerates once on a triple click", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({
					aiRecapState: "available",
					includesPrivateRuns: true
				})
			})
		);
		const user = userEvent.setup();

		await user.tripleClick(
			screen.getByRole("button", { name: "Add AI recap" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Regenerate your 2026 Rewind"
		});
		expect(
			within(dialog).getByText(
				"Your premium stats will be added to this Rewind too."
			)
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("switch", { name: "Include private runs" })
		).toHaveAttribute("aria-checked", "true");
		await user.tripleClick(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const requests = http().match(generateUrl);
		expect(requests).toHaveLength(1);
		expect(requests[0].request.body).toEqual({
			language: "en",
			includePrivateRuns: true,
			includeNotes: false,
			writeAiRecap: true,
			expectedGeneratedAt: "2026-12-02T10:00:00.000Z"
		});
		http().expectNone(`${generateUrl}/ai-recap`);
		const updated = rewindFixture({
			ownerControls: controls({ aiRecapState: "ready" })
		});
		requests[0].flush({ data: updated });
		expect(changes).toEqual([updated]);
	});

	it.each([
		[
			"Add AI recap when the Rewind already has premium stats",
			{
				premiumStats: {} as Rewind["premiumStats"],
				ownerControls: controls({ aiRecapState: "available" })
			},
			"Add AI recap"
		],
		[
			"Regenerate",
			{ ownerControls: controls({ aiRecapState: "ready" }) },
			"Regenerate"
		],
		[
			"Retry",
			{ ownerControls: controls({ aiRecapState: "failed" }) },
			"Retry"
		]
	] as const)(
		"leaves the premium stats line out of the dialog opened from %s",
		async (_, overrides, trigger) => {
			await renderPanel(rewindFixture(overrides));

			const dialog = await openGenerator(trigger);

			expect(
				within(dialog).queryByText(
					"Your premium stats will be added to this Rewind too."
				)
			).toBeNull();
		}
	);

	it("retries a failed AI recap through the regenerate dialog with a single request on a double click", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "failed" })
			})
		);

		await userEvent.dblClick(screen.getByRole("button", { name: "Retry" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Regenerate your 2026 Rewind"
		});
		await userEvent.dblClick(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		const requests = http().match(generateUrl);
		expect(requests).toHaveLength(1);
		expect(requests[0].request.body.writeAiRecap).toBe(true);
		requests[0].flush({ data: rewindFixture() });
	});

	it("shows a disabled Retry with its reason when the recap failed and no AI generation is left", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({
					aiRecapState: "failed",
					regenerationsLeft: 0,
					canRegenerate: false,
					regenerationBlockedBy: "no-regenerations-left"
				})
			})
		);

		const retry = screen.getByRole("button", { name: "Retry" });
		expect(retry).toBeDisabled();
		expect(aiButtons()).toHaveLength(1);
		expect(
			screen.getByText("You've used every AI generation for this Rewind.")
		).toBeInTheDocument();
		await userEvent.click(retry);
		expect(screen.queryByRole("dialog")).toBeNull();
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

	it("sends no request when the dialog opened from Add AI recap is cancelled", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);
		const dialog = await openGenerator("Add AI recap");

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);

		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		http().expectNone(generateUrl);
		expect(changes).toEqual([]);
	});

	it("says the AI recap adds nothing but the recap in the hint", async () => {
		await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);

		expect(
			screen.getAllByText("Adds an AI-written recap to this Rewind.")
				.length
		).toBeGreaterThan(0);
	});

	it("does not emit when the panel is gone before the AI recap arrives", async () => {
		const { fixture } = await renderPanel(
			rewindFixture({
				ownerControls: controls({ aiRecapState: "available" })
			})
		);
		const dialog = await openGenerator("Add AI recap");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Regenerate" })
		);

		fixture.destroy();
		http().expectOne(generateUrl).flush({ data: rewindFixture() });

		expect(changes).toEqual([]);
	});

	it("regenerates a Spanish Rewind from the dialog with its language and emits the new Rewind", async () => {
		await renderPanel(
			rewindFixture({
				language: "es",
				ownerControls: controls({ includesPrivateRuns: true })
			})
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Regenerate" })
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
			writeAiRecap: true,
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

		it("marks the AI generations as premium with the label of the owner's access, in English for any Rewind language", async () => {
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
				await screen.findByRole("button", { name: "Gift" })
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Premium" })
			).toBeNull();
			expect(screen.queryByRole("button", { name: "Regalo" })).toBeNull();
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

		it("shows how many AI generations are left and the grace in English for a Spanish Rewind with access", async () => {
			await renderPanel(
				rewindFixture({
					language: "es",
					ownerControls: controls({
						regenerationsLeft: 3,
						graceEndsAt: "2027-01-07"
					})
				})
			);

			expect(chip("3 AI generations left")).toBeInTheDocument();
			expect(
				screen.getByText("+1 extra until Jan 7")
			).toBeInTheDocument();
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("until Jan 31")).toBeInTheDocument();
			expect(screen.queryByText(/hasta el|Abierta/)).toBeNull();
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

		it("says Closed in English without a date while a Spanish Rewind waits to be frozen", async () => {
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

			expect(screen.getByText("Closed")).toBeInTheDocument();
			expect(screen.queryByText("Cerrado")).toBeNull();
			expect(screen.queryByText(/Final version from/)).toBeNull();
			expect(
				screen.getByText(
					"This Rewind can't be generated or regenerated anymore."
				)
			).toBeInTheDocument();
			http().expectNone(giftOffersUrl);
		});

		it("says the next season is not open yet in English while it is scheduled, whatever the Rewind language", async () => {
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
			expect(await screen.findByText("Not open yet")).toBeInTheDocument();
			expect(
				screen.getByText(/The next Rewind season hasn't opened yet/)
			).toBeInTheDocument();
			expect(screen.queryByText("Aún no abre")).toBeNull();
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

		it("shows the used-up reason once and keeps the closed reason out of the panel", async () => {
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
				screen.getByText(
					"You've used every AI generation for this Rewind."
				)
			).toBeInTheDocument();

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

		it("shows only the latest reason in English when the Rewind changes quickly between languages", async () => {
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
			sequence.forEach((ownerControls, index) => {
				fixture.componentRef.setInput(
					"rewind",
					rewindFixture({
						language: index % 2 === 0 ? "es" : "en",
						ownerControls
					})
				);
				fixture.detectChanges();
			});

			expect(
				screen.getAllByText(
					"Rewinds of previous years can only be regenerated with Premium."
				)
			).toHaveLength(1);
			expect(
				screen.queryByText(/solo se regeneran con Premium/)
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Regenerate" })
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
				"Rewind 2026 is closed. Your Rewinds stay as they were when it closed."
			],
			[
				403,
				"REWIND_YEAR_REQUIRES_PREMIUM",
				"Rewinds of previous years can only be generated with Premium."
			],
			[
				409,
				"REWIND_REGENERATION_LIMIT",
				"You've used every AI generation for 2026."
			]
		])(
			"explains a %s %s on Add AI recap and reloads the Rewind",
			async (status, type, message) => {
				await renderPanel(
					rewindFixture({
						ownerControls: controls({ aiRecapState: "available" })
					})
				);
				await userEvent.click(
					screen.getByRole("button", { name: "Add AI recap" })
				);
				const dialog = await screen.findByRole("dialog", {
					name: "Regenerate your 2026 Rewind"
				});
				await userEvent.dblClick(
					within(dialog).getByRole("button", {
						name: "Regenerate"
					})
				);

				const requests = http().match(generateUrl);
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

				expect(
					await within(dialog).findByText(message)
				).toBeInTheDocument();
				expect(changes).toEqual([reloaded]);
			}
		);
	});
	describe("premium zone", () => {
		const giftOffersUrl = `${api}/users/me/gift-offers`;
		const noAccess = { allowed: false, source: null, expiresAt: null };

		function premiumZone() {
			return (
				[
					...document.querySelectorAll<HTMLElement>(
						"[data-premium-zone]"
					)
				].find(zone => !zone.closest("[role=dialog]")) ?? null
			);
		}

		it("groups the AI generations, the extra day and a single Add AI recap button in a gold framed zone", async () => {
			await renderPanel(
				rewindFixture({
					ownerControls: controls({
						aiRecapState: "available",
						graceEndsAt: "2027-02-07T23:59:59.999Z"
					})
				})
			);

			const zone = premiumZone();
			expect(zone).not.toBeNull();
			expect(zone?.className).toContain("border-premium/30");
			const inZone = within(zone as HTMLElement);
			expect(
				inZone.getByRole("button", { name: "Premium" })
			).toBeInTheDocument();
			expect(
				inZone.getByText(/AI generations? left/)
			).toBeInTheDocument();
			expect(inZone.getByText(/\+1 extra until/)).toBeInTheDocument();
			expect(
				inZone.getByRole("button", { name: "Add AI recap" })
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /Regenerate/ })
			).toBeNull();
			expect(aiButtons()).toHaveLength(1);
			expect(screen.getByRole("group", { name: "Premium" })).toBe(zone);
		});

		it("moves the private runs and notes chips into the premium zone with access, and keeps them in the top row without it", async () => {
			const { fixture } = await renderPanel(
				rewindFixture({
					ownerControls: controls({
						includesPrivateRuns: true,
						includesNotes: true
					})
				})
			);

			const inZone = within(premiumZone() as HTMLElement);
			expect(
				inZone.getByText("Includes private runs")
			).toBeInTheDocument();
			expect(inZone.getByText("Uses your notes")).toBeInTheDocument();
			expect(screen.getAllByText("Includes private runs")).toHaveLength(
				1
			);

			fixture.componentRef.setInput(
				"rewind",
				rewindFixture({
					premiumAccess: noAccess,
					ownerControls: controls({
						includesPrivateRuns: true,
						includesNotes: true,
						canRegenerate: false,
						regenerationBlockedBy: "no-ai-access"
					})
				})
			);
			fixture.detectChanges();
			http()
				.match(giftOffersUrl)
				.forEach(request => request.flush({ data: { offers: [] } }));

			expect(premiumZone()).toBeNull();
			expect(screen.getAllByText("Includes private runs")).toHaveLength(
				1
			);
			expect(screen.getByText("Uses your notes")).toBeInTheDocument();
		});

		it("explains what an AI generation does every time the crown is pressed, even twice in a row", async () => {
			await renderPanel(rewindFixture());
			const toast = TestBed.inject(ToastService) as unknown as {
				premium: ReturnType<typeof vi.fn>;
			};
			const user = userEvent.setup();

			const crown = within(premiumZone() as HTMLElement).getByRole(
				"button",
				{
					name: "Premium"
				}
			);
			await user.dblClick(crown);

			expect(toast.premium).toHaveBeenCalledTimes(2);
			expect(toast.premium).toHaveBeenLastCalledWith(
				"Premium perk",
				"Each AI generation writes a new AI recap and premium stats for this Rewind."
			);
		});

		it("shows no premium zone, crown or gold without AI access", async () => {
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

			expect(premiumZone()).toBeNull();
			expect(
				screen.queryByRole("group", { name: /Premium|Gift/ })
			).toBeNull();
			expect(
				document.querySelector(".text-premium, .border-premium\\/30")
			).toBeNull();
		});

		it("keeps the closed reason in the dialog after the reload closes the zone", async () => {
			const { fixture } = await renderPanel(
				rewindFixture({
					ownerControls: controls({ aiRecapState: "available" })
				})
			);
			const user = userEvent.setup();

			await user.click(
				screen.getByRole("button", { name: "Add AI recap" })
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Regenerate your 2026 Rewind"
			});
			await user.click(
				within(dialog).getByRole("button", { name: "Regenerate" })
			);
			http().expectOne(generateUrl).flush(
				{
					type: "REWIND_PERIOD_CLOSED",
					title: "Closed",
					status: 409
				},
				{ status: 409, statusText: "Conflict" }
			);
			const closed = rewindFixture({
				ownerControls: controls({
					periodStatus: "closed",
					periodOpen: false,
					canRegenerate: false,
					regenerationBlockedBy: "period-closed"
				})
			});
			http().expectOne(rewindUrl).flush({ data: closed });
			fixture.componentRef.setInput("rewind", closed);
			fixture.detectChanges();

			expect(premiumZone()).toBeNull();
			expect(
				await within(dialog).findByText(
					"Rewind 2026 is closed. Your Rewinds stay as they were when it closed."
				)
			).toBeInTheDocument();
		});
	});
});
