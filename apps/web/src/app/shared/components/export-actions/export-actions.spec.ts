import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { type Observable, of, Subject, throwError } from "rxjs";

import { type PremiumFeature } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import {
	type ExportFormat,
	type ExportParams,
	ExportService
} from "../../../core/services/export";
import { type ExportResource } from "../../../core/services/export.model";
import { ToastService } from "../../../core/services/toast";
import { QueueBrowser } from "../../../features/queue/queue-browser/queue-browser";
import { type GiftOffer } from "../gift-offer-card/gift-offer-card.model";
import { GiftOffersService } from "../gift-offer-card/gift-offers.service";
import { ExportActions } from "./export-actions";

const JSON_GIFT: GiftOffer = {
	code: "json-launch",
	feature: "export.json",
	availableFrom: "2026-10-01T00:00:00.000Z",
	availableUntil: "2099-12-01T00:00:00.000Z",
	status: "available",
	expiresAt: null,
	canActivate: true,
	hasAccess: false
};

const ACTIVE_JSON_GIFT: GiftOffer = {
	...JSON_GIFT,
	status: "active",
	canActivate: false,
	hasAccess: true,
	expiresAt: JSON_GIFT.availableUntil
};

describe("ExportActions", () => {
	const isPremium = signal(false);
	const features = signal<PremiumFeature[]>([]);
	const auth = {
		isPremium,
		hasPremiumFeature: (feature: PremiumFeature) =>
			isPremium() || features().includes(feature),
		loadUser: vi.fn()
	};
	const giftOffers = {
		listOffers: vi.fn(),
		claimOffer: vi.fn()
	};
	let pending: Map<ExportFormat, Subject<void>>;
	const exportService = {
		download: vi.fn(
			(
				_resource: ExportResource,
				format: ExportFormat,
				_params?: ExportParams
			): Observable<void> => {
				const download = new Subject<void>();
				pending.set(format, download);
				return download;
			}
		)
	};
	const toast = { error: vi.fn(), premium: vi.fn() };

	function providers() {
		return [
			{ provide: AuthService, useValue: auth },
			{ provide: ExportService, useValue: exportService },
			{ provide: GiftOffersService, useValue: giftOffers },
			{ provide: ToastService, useValue: toast }
		];
	}

	async function renderActions(resource: ExportResource = "backlog") {
		return render(ExportActions, {
			inputs: { resource, label: "My Games" },
			providers: providers()
		});
	}

	function finish(format: ExportFormat) {
		const download = pending.get(format)!;
		download.next();
		download.complete();
	}

	beforeEach(() => {
		isPremium.set(false);
		features.set([]);
		auth.loadUser.mockReset();
		auth.loadUser.mockImplementation(() => {
			features.set(["export.json"]);
			return of({});
		});
		giftOffers.listOffers.mockReset();
		giftOffers.listOffers.mockReturnValue(of([]));
		giftOffers.claimOffer.mockReset();
		giftOffers.claimOffer.mockReturnValue(
			of({ offer: ACTIVE_JSON_GIFT, created: true })
		);
		pending = new Map();
		exportService.download.mockClear();
		toast.error.mockReset();
		toast.premium.mockReset();
	});

	it("shows only the CSV button to free users", async () => {
		await renderActions();

		const csv = screen.getByRole("button", {
			name: "Download My Games as CSV"
		});
		expect(csv).toHaveTextContent("CSV");
		expect(csv).toHaveAttribute("title", "Download My Games as CSV");
		expect(
			screen.queryByRole("button", { name: "Download My Games as JSON" })
		).not.toBeInTheDocument();
	});

	it("shows the JSON button in gold to premium users", async () => {
		isPremium.set(true);
		await renderActions();

		expect(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		).toHaveAttribute("data-variant", "secondary");
		expect(
			screen.getByRole("button", { name: "Download My Games as JSON" })
		).toHaveAttribute("data-variant", "premium");
	});

	it("explains the JSON perk from the premium badge", async () => {
		isPremium.set(true);
		await renderActions();

		await userEvent.click(
			screen.getByRole("button", { name: "Premium perk: JSON export" })
		);

		expect(toast.premium).toHaveBeenCalledWith(
			"Premium perk",
			"JSON export is a Premium perk. Free accounts can download their collections as CSV."
		);
	});

	it("hides the premium badge from free users", async () => {
		await renderActions();

		expect(
			screen.queryByRole("button", { name: "Premium perk: JSON export" })
		).not.toBeInTheDocument();
	});

	it("disables the button while it downloads and keeps the other one active", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		await renderActions({ listId: "list-1" });
		const csv = screen.getByRole("button", {
			name: "Download My Games as CSV"
		});
		const json = screen.getByRole("button", {
			name: "Download My Games as JSON"
		});

		await user.click(csv);
		await user.click(csv);

		expect(exportService.download).toHaveBeenCalledTimes(1);
		expect(exportService.download).toHaveBeenCalledWith(
			{ listId: "list-1" },
			"csv",
			{}
		);
		expect(csv).toBeDisabled();
		expect(csv).toHaveAttribute("aria-busy", "true");
		expect(json).not.toBeDisabled();
		expect(json).not.toHaveAttribute("aria-busy");

		finish("csv");
		await waitFor(() => expect(csv).not.toBeDisabled());
		expect(csv).not.toHaveAttribute("aria-busy");
	});

	it("shows an error toast when the download fails for an unhandled reason", async () => {
		const user = userEvent.setup();
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 500 }))
		);
		await renderActions();

		await user.click(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Could not download My Games. Please try again."
		);
		expect(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		).not.toBeDisabled();
	});

	it("forwards the view params to the download", async () => {
		const user = userEvent.setup();
		await render(ExportActions, {
			inputs: {
				resource: "platinums",
				label: "Platinums",
				params: { search: "elden", platform: "any" }
			},
			providers: providers()
		});

		await user.click(
			screen.getByRole("button", { name: "Download Platinums as CSV" })
		);

		expect(exportService.download).toHaveBeenCalledWith(
			"platinums",
			"csv",
			{
				search: "elden",
				platform: "any"
			}
		);
	});

	it("shows an error toast when the format is not acceptable (406)", async () => {
		const user = userEvent.setup();
		exportService.download.mockReturnValueOnce(
			throwError(() => ({
				status: 406,
				error: { type: "EXPORT_FORMAT_NOT_ACCEPTABLE" }
			}))
		);
		await renderActions();

		await user.click(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Could not download My Games. Please try again."
		);
	});

	it("leaves the plan limit toast to the interceptor on a 402", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 402 }))
		);
		await renderActions();

		await user.click(
			screen.getByRole("button", { name: "Download My Games as JSON" })
		);

		expect(toast.error).not.toHaveBeenCalled();
	});

	it("shows the JSON button to a free user with the JSON export gift", async () => {
		features.set(["export.json"]);
		giftOffers.listOffers.mockReturnValue(of([ACTIVE_JSON_GIFT]));
		await renderActions();

		expect(
			screen.getByRole("button", { name: "Download My Games as JSON" })
		).toBeInTheDocument();
		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
	});

	it("asks for the offers only once for a free user", async () => {
		await renderActions();

		expect(giftOffers.listOffers).toHaveBeenCalledTimes(1);
	});

	it("never asks for the offers for a premium user", async () => {
		isPremium.set(true);
		await renderActions();

		expect(giftOffers.listOffers).not.toHaveBeenCalled();
	});

	it("reveals the JSON button right after activating the gift with a double click", async () => {
		const user = userEvent.setup();
		giftOffers.listOffers.mockReturnValue(of([JSON_GIFT]));
		await renderActions();

		await user.dblClick(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		expect(giftOffers.claimOffer).toHaveBeenCalledTimes(1);
		expect(auth.loadUser).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByRole("button", {
				name: "Download My Games as JSON"
			})
		).toBeInTheDocument();
	});

	it("still reveals the JSON button when refreshing the user fails after the claim", async () => {
		giftOffers.listOffers.mockReturnValue(of([JSON_GIFT]));
		auth.loadUser.mockReturnValue(throwError(() => new Error("offline")));
		await renderActions();

		await userEvent.click(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		expect(
			await screen.findByRole("button", {
				name: "Download My Games as JSON"
			})
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("keeps JSON hidden when the gift was revoked between listing and claiming", async () => {
		giftOffers.listOffers
			.mockReturnValueOnce(of([JSON_GIFT]))
			.mockReturnValueOnce(of([]));
		giftOffers.claimOffer.mockReturnValue(
			of({
				offer: { ...JSON_GIFT, status: "expired", canActivate: false },
				created: false
			})
		);
		await renderActions();

		await userEvent.click(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Activate gift" })
			).not.toBeInTheDocument()
		);
		expect(
			screen.queryByRole("button", { name: "Download My Games as JSON" })
		).not.toBeInTheDocument();
		expect(auth.loadUser).not.toHaveBeenCalled();
	});

	it("hides the JSON button when the gift ends while the view is open", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const endsSoon = new Date(Date.now() + 60_000).toISOString();
			features.set(["export.json"]);
			auth.loadUser.mockImplementation(() => {
				features.set([]);
				return of({});
			});
			giftOffers.listOffers.mockReturnValue(
				of([
					{
						...ACTIVE_JSON_GIFT,
						availableUntil: endsSoon,
						expiresAt: endsSoon
					}
				])
			);
			const { fixture } = await renderActions();
			expect(
				screen.getByRole("button", {
					name: "Download My Games as JSON"
				})
			).toBeInTheDocument();

			vi.advanceTimersByTime(60_000);
			fixture.detectChanges();

			expect(auth.loadUser).toHaveBeenCalledTimes(1);
			expect(
				screen.queryByRole("button", {
					name: "Download My Games as JSON"
				})
			).not.toBeInTheDocument();
			expect(
				screen.queryByText(/Gift active until/)
			).not.toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it("hides the JSON button at the end of a gift claimed while the user refresh failed", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const endsSoon = new Date(Date.now() + 120_000).toISOString();
			const gift = { ...JSON_GIFT, availableUntil: endsSoon };
			giftOffers.listOffers.mockReturnValue(of([gift]));
			giftOffers.claimOffer.mockReturnValue(
				of({
					offer: {
						...ACTIVE_JSON_GIFT,
						availableUntil: endsSoon,
						expiresAt: endsSoon
					},
					created: true
				})
			);
			auth.loadUser.mockReturnValue(
				throwError(() => new Error("offline"))
			);
			const { fixture } = await renderActions();

			fireEvent.click(
				screen.getByRole("button", { name: "Activate gift" })
			);
			fixture.detectChanges();
			expect(
				screen.getByRole("button", {
					name: "Download My Games as JSON"
				})
			).toBeInTheDocument();

			vi.advanceTimersByTime(120_000);
			fixture.detectChanges();

			expect(
				screen.queryByRole("button", {
					name: "Download My Games as JSON"
				})
			).not.toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	describe("in Up Next", () => {
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

		async function renderQueue(inputs: Record<string, unknown>) {
			return render(QueueBrowser, {
				inputs: {
					searchPlaceholder: "Search your queue...",
					noMatchesScope: "Up Next",
					entries: [],
					queueIsEmpty: false,
					searchQuery: "",
					offset: 0,
					limit: 20,
					total: 0,
					...inputs
				},
				providers: providers()
			});
		}

		it("offers the export on the own queue once it has loaded", async () => {
			await renderQueue({ isLoading: false });

			expect(
				screen.getByRole("button", { name: "Download Up Next as CSV" })
			).toBeInTheDocument();
		});

		it("hides the export while the queue loads", async () => {
			await renderQueue({ isLoading: true });

			expect(
				screen.queryByRole("button", {
					name: "Download Up Next as CSV"
				})
			).not.toBeInTheDocument();
		});

		it("hides the export on a public queue", async () => {
			await renderQueue({ isLoading: false, readonly: true });

			expect(
				screen.queryByRole("button", {
					name: "Download Up Next as CSV"
				})
			).not.toBeInTheDocument();
		});
	});
});
