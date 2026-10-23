import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { UserQueue } from "./user-queue";

function queueEntry(id: string, position: number, title: string) {
	return {
		id,
		position,
		backlog: {
			id: `b-${id}`,
			status: "not_started",
			ratio: 1.2,
			game: { id: `g-${id}`, code: id, title, isDlc: false },
			platform: { id: "pc", abbreviation: "PC" }
		}
	};
}

describe("UserQueue", () => {
	const getUserQueue = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getUserQueue.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPage() {
		return render(UserQueue, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { paramMap: { get: () => "ada" } }
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						user: signal(null),
						loadUser: vi.fn()
					}
				},
				{ provide: PublicLibraryService, useValue: { getUserQueue } }
			]
		});
	}

	it("loads up to a hundred queued games and shows them read-only with the owner's count", async () => {
		getUserQueue.mockReturnValue(
			of({
				items: [
					queueEntry("hades", 1, "Hades"),
					queueEntry("celeste", 2, "Celeste")
				],
				total: 2
			})
		);
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Up Next" })
		).toBeInTheDocument();
		expect(getUserQueue).toHaveBeenCalledWith("ada", {
			limit: 100,
			offset: 0
		});
		expect(screen.getByText(/games in their queue/)).toHaveTextContent(
			/2\s*games in their queue/
		);
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(
			screen.getByRole("link", { name: /@ada's profile/ })
		).toHaveAttribute("href", "/user/ada");
	});

	it("shows the private state when the owner does not share the queue", async () => {
		getUserQueue.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", {
				name: "This queue is private"
			})
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Up Next" })
		).not.toBeInTheDocument();
	});

	it("shows the not-found state when the player does not exist", async () => {
		getUserQueue.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderPage();

		expect(
			await screen.findByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
	});

	it("shows the empty state when nothing is queued", async () => {
		getUserQueue.mockReturnValue(of({ items: [], total: 0 }));
		await renderPage();

		expect(
			await screen.findByText("Nothing queued yet")
		).toBeInTheDocument();
		expect(
			screen.getByText("@ada hasn't lined up any games to play next.")
		).toBeInTheDocument();
	});
});
