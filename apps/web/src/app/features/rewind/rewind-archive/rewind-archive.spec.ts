import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter
} from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
	type RewindYears,
	type RewindYearSummary
} from "../../../core/models/rewind.model";
import { AuthService } from "../../../core/services/auth";
import { RewindArchive } from "./rewind-archive";

function year(value: number, isGenerated: boolean): RewindYearSummary {
	return {
		year: value,
		isGenerated,
		finishedCount: 5,
		startedCount: 6,
		hoursPlayed: 40,
		persona: "finisher",
		covers: []
	};
}

describe("RewindArchive", () => {
	async function renderArchive(viewer: string | null, years: RewindYears) {
		const params = convertToParamMap({ username: "ada" });
		await render(RewindArchive, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: of(params),
						snapshot: { paramMap: params }
					}
				},
				{
					provide: AuthService,
					useValue: {
						user: signal(viewer ? { username: viewer } : null),
						isPremium: signal(false)
					}
				}
			]
		});
		TestBed.inject(HttpTestingController)
			.expectOne(`${environment.apiUrl}/users/ada/rewinds`)
			.flush({ data: years });
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
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		TestBed.inject(HttpTestingController).verify();
	});

	it("shows the owner a Generate card for each year still unpublished", async () => {
		await renderArchive("Ada", {
			spotlightYear: 2026,
			years: [year(2026, false), year(2025, true)]
		});

		expect(
			await screen.findByRole("button", {
				name: "Generate your 2026 Rewind"
			})
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /2025/ })).toHaveAttribute(
			"href",
			"/user/ada/rewind/2025"
		);
		expect(screen.queryByRole("link", { name: /2026/ })).toBeNull();
	});

	it("shows a visitor only the published years the API sends, with no Generate action", async () => {
		await renderArchive("grace", {
			spotlightYear: null,
			years: [year(2025, true)]
		});

		expect(
			await screen.findByRole("link", { name: /2025/ })
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Generate/ })).toBeNull();
	});

	it("tells a visitor the user hasn't shared a Rewind yet", async () => {
		await renderArchive(null, { spotlightYear: null, years: [] });

		expect(
			await screen.findByText("@ada hasn't shared a Rewind yet.")
		).toBeInTheDocument();
	});
});
