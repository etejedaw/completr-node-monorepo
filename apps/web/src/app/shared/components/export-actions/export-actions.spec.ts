import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/angular";
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

	function exportButton() {
		return screen.getByRole("button", { name: "Export" });
	}

	async function openExportMenu(
		user: ReturnType<typeof userEvent.setup>,
		label = "My Games"
	) {
		await waitFor(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		);
		await user.click(exportButton());
		return screen.findByRole("menu", { name: `Export ${label}` });
	}

	function openExportMenuNow(label = "My Games") {
		fireEvent.click(exportButton());
		return screen.findByRole("menu", { name: `Export ${label}` });
	}

	function menuItem(menu: HTMLElement, format: "CSV" | "JSON") {
		return within(menu).getByRole("menuitem", {
			name: `Download ${format}`
		});
	}

	function finish(format: ExportFormat) {
		const download = pending.get(format)!;
		download.next();
		download.complete();
	}

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
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

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("groups both formats under a single Export button", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		await renderActions();

		expect(screen.getAllByRole("button")).toHaveLength(1);
		const menu = await openExportMenu(user);

		expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
		expect(menuItem(menu, "CSV")).toHaveAccessibleDescription(
			"Opens in any spreadsheet"
		);
		expect(menuItem(menu, "JSON")).toHaveAccessibleDescription(
			"Full data, for backups"
		);
	});

	it("shows JSON as a locked Premium perk to free users", async () => {
		const user = userEvent.setup();
		await renderActions();

		const menu = await openExportMenu(user);

		expect(menuItem(menu, "CSV")).toBeInTheDocument();
		expect(menuItem(menu, "JSON")).toHaveAccessibleDescription(
			"Premium perk"
		);
	});

	it("lets the API explain the perk when a free user picks JSON", async () => {
		const user = userEvent.setup();
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 402 }))
		);
		await renderActions();

		await user.click(menuItem(await openExportMenu(user), "JSON"));

		expect(exportService.download).toHaveBeenCalledWith(
			"backlog",
			"json",
			{}
		);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("blocks a second download of the same format while the first one runs", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		await renderActions({ listId: "list-1" });

		await user.click(menuItem(await openExportMenu(user), "CSV"));
		expect(exportButton()).toHaveAttribute("aria-busy", "true");
		const menu = await openExportMenu(user);
		await user.click(menuItem(menu, "CSV"));

		expect(exportService.download).toHaveBeenCalledTimes(1);
		expect(exportService.download).toHaveBeenCalledWith(
			{ listId: "list-1" },
			"csv",
			{}
		);

		await user.click(menuItem(menu, "JSON"));
		expect(exportService.download).toHaveBeenCalledTimes(2);

		finish("csv");
		finish("json");
		await waitFor(() =>
			expect(exportButton()).not.toHaveAttribute("aria-busy")
		);
	});

	it("shows an error toast when the download fails for an unhandled reason", async () => {
		const user = userEvent.setup();
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 500 }))
		);
		await renderActions();

		await user.click(menuItem(await openExportMenu(user), "CSV"));

		expect(toast.error).toHaveBeenCalledWith(
			"Could not download My Games. Please try again."
		);
		expect(exportButton()).not.toHaveAttribute("aria-busy");
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
			menuItem(await openExportMenu(user, "Platinums"), "CSV")
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

		await user.click(menuItem(await openExportMenu(user), "CSV"));

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

		await user.click(menuItem(await openExportMenu(user), "JSON"));

		expect(toast.error).not.toHaveBeenCalled();
	});

	it("unlocks JSON for a free user with the JSON export gift", async () => {
		const user = userEvent.setup();
		features.set(["export.json"]);
		giftOffers.listOffers.mockReturnValue(of([ACTIVE_JSON_GIFT]));
		await renderActions();

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(
			menuItem(await openExportMenu(user), "JSON")
		).toHaveAccessibleDescription("Full data, for backups");
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

	it("unlocks JSON right after activating the gift with a double click", async () => {
		const user = userEvent.setup();
		giftOffers.listOffers.mockReturnValue(of([JSON_GIFT]));
		await renderActions();

		await user.dblClick(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		expect(giftOffers.claimOffer).toHaveBeenCalledTimes(1);
		expect(auth.loadUser).toHaveBeenCalledTimes(1);
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Activate gift" })
			).not.toBeInTheDocument()
		);
		expect(
			menuItem(await openExportMenu(user), "JSON")
		).toHaveAccessibleDescription("Full data, for backups");
	});

	it("still unlocks JSON when refreshing the user fails after the claim", async () => {
		const user = userEvent.setup();
		giftOffers.listOffers.mockReturnValue(of([JSON_GIFT]));
		auth.loadUser.mockReturnValue(throwError(() => new Error("offline")));
		await renderActions();

		await user.click(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		expect(
			await screen.findByText(/Gift active until/)
		).toBeInTheDocument();
		expect(
			menuItem(await openExportMenu(user), "JSON")
		).toHaveAccessibleDescription("Full data, for backups");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("keeps JSON locked when the gift was revoked between listing and claiming", async () => {
		const user = userEvent.setup();
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

		await user.click(
			await screen.findByRole("button", { name: "Activate gift" })
		);

		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Activate gift" })
			).not.toBeInTheDocument()
		);
		expect(
			menuItem(await openExportMenu(user), "JSON")
		).toHaveAccessibleDescription("Premium perk");
		expect(auth.loadUser).not.toHaveBeenCalled();
	});

	it("locks JSON again when the gift ends while the view is open", async () => {
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

			vi.advanceTimersByTime(60_000);
			fixture.detectChanges();

			expect(auth.loadUser).toHaveBeenCalledTimes(1);
			expect(
				screen.queryByText(/Gift active until/)
			).not.toBeInTheDocument();
			const menu = await openExportMenuNow();
			fixture.detectChanges();
			expect(menuItem(menu, "JSON")).toHaveAccessibleDescription(
				"Premium perk"
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it("locks JSON at the end of a gift claimed while the user refresh failed", async () => {
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
			expect(screen.getByText(/Gift active until/)).toBeInTheDocument();

			vi.advanceTimersByTime(120_000);
			fixture.detectChanges();

			const menu = await openExportMenuNow();
			fixture.detectChanges();
			expect(menuItem(menu, "JSON")).toHaveAccessibleDescription(
				"Premium perk"
			);
		} finally {
			vi.useRealTimers();
		}
	});

	describe("in Up Next", () => {
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
				screen.getByRole("button", { name: "Export" })
			).toBeInTheDocument();
		});

		it("hides the export while the queue loads", async () => {
			await renderQueue({ isLoading: true });

			expect(
				screen.queryByRole("button", { name: "Export" })
			).not.toBeInTheDocument();
		});

		it("hides the export on a public queue", async () => {
			await renderQueue({ isLoading: false, readonly: true });

			expect(
				screen.queryByRole("button", { name: "Export" })
			).not.toBeInTheDocument();
		});
	});
});
