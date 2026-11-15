import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import { NEVER, of } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { ExportService } from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { GiftOffersService } from "../../../shared/components/gift-offer-card/gift-offers.service";
import { QueueBrowser } from "./queue-browser";

describe("QueueBrowser", () => {
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

	async function renderQueue(inputs: Record<string, unknown>) {
		return render(QueueBrowser, {
			inputs: {
				noMatchesScope: "Up Next",
				entries: [],
				queueIsEmpty: false,
				searchQuery: "",
				offset: 0,
				limit: 20,
				total: 0,
				...inputs
			},
			providers: [
				{
					provide: AuthService,
					useValue: {
						isPremium: () => false,
						hasPremiumFeature: () => false,
						loadUser: () => of({})
					}
				},
				{ provide: ExportService, useValue: { download: () => NEVER } },
				{
					provide: GiftOffersService,
					useValue: {
						listOffers: () => of([]),
						claimOffer: () => NEVER
					}
				},
				{
					provide: ToastService,
					useValue: { error: vi.fn(), premium: vi.fn() }
				}
			]
		});
	}

	describe("export", () => {
		it("is offered on the own queue once it has loaded", async () => {
			await renderQueue({ isLoading: false });

			expect(
				screen.getByRole("button", { name: "Export" })
			).toBeInTheDocument();
		});

		it("is hidden while the queue loads", async () => {
			await renderQueue({ isLoading: true });

			expect(
				screen.queryByRole("button", { name: "Export" })
			).not.toBeInTheDocument();
		});

		it("is hidden on a public queue", async () => {
			await renderQueue({ isLoading: false, readonly: true });

			expect(
				screen.queryByRole("button", { name: "Export" })
			).not.toBeInTheDocument();
		});
	});
});
