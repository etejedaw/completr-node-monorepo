import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import { of, throwError } from "rxjs";

import { PublicLibraryService } from "../services/public-library.service";
import { ProfilePlayingNow } from "./profile-playing-now";

function entry(id: string, title: string, abbreviation: string) {
	return {
		id,
		ratio: 2,
		game: { id: `g-${id}`, code: id, title },
		platform: { id: "p", abbreviation }
	};
}

describe("ProfilePlayingNow", () => {
	const getUserBacklog = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		getUserBacklog.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderPlayingNow() {
		return render(ProfilePlayingNow, {
			providers: [
				provideRouter([]),
				{ provide: PublicLibraryService, useValue: { getUserBacklog } }
			],
			inputs: { username: "ada" }
		});
	}

	it("asks for the games being played, most recently started first", async () => {
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPlayingNow();

		expect(getUserBacklog).toHaveBeenCalledWith("ada", {
			status: "playing",
			sort_by: "startedAt",
			sort_order: "desc",
			limit: 12
		});
	});

	it("shows the games in progress with a link to the playing filter", async () => {
		getUserBacklog.mockReturnValue(
			of({
				items: [
					entry("hades", "Hades", "PC"),
					entry("celeste", "Celeste", "NSW")
				],
				total: 2
			})
		);
		await renderPlayingNow();

		expect(
			await screen.findByRole("heading", { name: "Playing now" })
		).toBeInTheDocument();
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
			"href",
			"/user/ada/backlog?status=playing"
		);
	});

	it("renders nothing when nothing is being played", async () => {
		getUserBacklog.mockReturnValue(of({ items: [], total: 0 }));
		await renderPlayingNow();

		expect(
			screen.queryByRole("heading", { name: "Playing now" })
		).not.toBeInTheDocument();
	});

	it("renders nothing when the backlog request is denied", async () => {
		getUserBacklog.mockReturnValue(throwError(() => ({ status: 403 })));
		await renderPlayingNow();

		await waitFor(() => expect(getUserBacklog).toHaveBeenCalled());
		expect(
			screen.queryByRole("heading", { name: "Playing now" })
		).not.toBeInTheDocument();
	});
});
