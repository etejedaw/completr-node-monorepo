import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";

import { environment } from "../../../../environments/environment";
import { AuthShowcase } from "./auth-showcase";

const api = environment.apiUrl;

function showcaseGame(index: number) {
	return {
		id: `g${index}`,
		code: `game-${index}`,
		title: `Game ${index}`,
		backgroundUrl: `https://img.example/game-${index}.jpg`
	};
}

describe("AuthShowcase", () => {
	let httpTesting: HttpTestingController;

	async function renderShowcase() {
		const result = await render(AuthShowcase, {
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		return result;
	}

	async function answer(body: object) {
		httpTesting.expectOne(`${api}/games/showcase`).flush(body);
		await TestBed.inject(ApplicationRef).whenStable();
	}

	async function fail() {
		httpTesting
			.expectOne(`${api}/games/showcase`)
			.flush(null, { status: 500, statusText: "Server Error" });
		await TestBed.inject(ApplicationRef).whenStable();
	}

	afterEach(() => {
		httpTesting.verify();
	});

	it("renders the marketing copy and the selling points", async () => {
		await renderShowcase();
		await answer({ data: { games: [], featured: null } });

		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			/Play what's\s*worth your time\./
		);
		expect(
			screen.getByText(/ranks your backlog by score per hour/i)
		).toBeInTheDocument();
		expect(screen.getByText("Ratio-ranked backlog")).toBeInTheDocument();
		expect(
			screen.getByText("Metacritic, OpenCritic & HLTB")
		).toBeInTheDocument();
		expect(screen.getByText("See what friends play")).toBeInTheDocument();
	});

	it("hides the featured card while the showcase loads", async () => {
		await renderShowcase();

		expect(screen.queryByText("Up next · #1")).not.toBeInTheDocument();

		await answer({ data: { games: [], featured: null } });
		expect(screen.getByText("Up next · #1")).toBeInTheDocument();
	});

	it("falls back to placeholder titles and featured game without catalog data", async () => {
		await renderShowcase();
		await answer({ data: { games: [], featured: null } });

		expect(screen.getAllByText("Hollow Tide").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Neon Drift").length).toBeGreaterThan(0);
		expect(screen.getByText("Score 4.6 · 12h to beat")).toBeInTheDocument();
		expect(screen.getByText("8.4")).toBeInTheDocument();
	});

	it("falls back to placeholders when there are fewer games than a column needs", async () => {
		await renderShowcase();
		await answer({
			data: { games: [1, 2, 3].map(showcaseGame), featured: null }
		});

		expect(screen.queryByAltText("Game 1")).not.toBeInTheDocument();
		expect(screen.getAllByText("Hollow Tide").length).toBeGreaterThan(0);
	});

	it("shows the catalog games once there are enough of them", async () => {
		await renderShowcase();
		await answer({
			data: {
				games: [1, 2, 3, 4, 5, 6].map(showcaseGame),
				featured: null
			}
		});

		expect(screen.getAllByAltText("Game 1").length).toBeGreaterThan(0);
		expect(screen.getAllByAltText("Game 6").length).toBeGreaterThan(0);
		expect(screen.queryByLabelText("Neon Drift")).not.toBeInTheDocument();
	});

	it("shows the featured game with its score, hours and ratio", async () => {
		await renderShowcase();
		await answer({
			data: {
				games: [],
				featured: {
					...showcaseGame(9),
					title: "Celeste",
					score: 4.9,
					hours: 8,
					ratio: 12.3
				}
			}
		});

		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(screen.getByText("Score 4.9 · 8h to beat")).toBeInTheDocument();
		expect(screen.getByText("12.3")).toBeInTheDocument();
		expect(
			screen.queryByText("Score 4.6 · 12h to beat")
		).not.toBeInTheDocument();
	});

	it("falls back to placeholders when the request fails", async () => {
		await renderShowcase();
		await fail();

		expect(screen.getAllByText("Hollow Tide").length).toBeGreaterThan(0);
		expect(screen.getByText("Score 4.6 · 12h to beat")).toBeInTheDocument();
	});
});
