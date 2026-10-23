import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import { of, Subject } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { GamesService } from "../../games";
import { GameSocialActivity } from "./game-social-activity";

const friend = {
	username: "ada",
	name: "Ada Lovelace",
	avatarUrl: null,
	role: "user",
	status: "completed",
	finishedAt: "2024-05-01T00:00:00.000Z",
	userRating: 4.5
};

const player = {
	username: "grace",
	name: "Grace Hopper",
	avatarUrl: null,
	role: "premium",
	status: "playing"
};

describe("GameSocialActivity", () => {
	const isLoggedIn = signal(true);
	const getFriendsActivity = vi.fn();
	const getPlayers = vi.fn();

	function renderActivity(gameId = "g1") {
		return render(GameSocialActivity, {
			providers: [
				provideRouter([]),
				{
					provide: GamesService,
					useValue: { getFriendsActivity, getPlayers }
				},
				{ provide: AuthService, useValue: { isLoggedIn } }
			],
			inputs: { gameId }
		});
	}

	beforeEach(() => {
		isLoggedIn.set(true);
		getFriendsActivity.mockReset().mockReturnValue(of([]));
		getPlayers.mockReset().mockReturnValue(of([]));
	});

	it("loads friends and players of the game for a logged in user", async () => {
		getFriendsActivity.mockReturnValue(of([friend]));
		getPlayers.mockReturnValue(of([player]));

		await renderActivity("g1");

		expect(getFriendsActivity).toHaveBeenCalledWith("g1");
		expect(getPlayers).toHaveBeenCalledWith("g1");
		expect(
			screen.getByRole("heading", { name: "Played by Friends" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Other Players" })
		).toBeInTheDocument();
	});

	it("does not request anything for guests", async () => {
		isLoggedIn.set(false);

		await renderActivity();

		expect(getFriendsActivity).not.toHaveBeenCalled();
		expect(getPlayers).not.toHaveBeenCalled();
	});

	it("renders nothing when nobody played the game", async () => {
		await renderActivity();

		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});

	it("shows each friend with link, rating and status", async () => {
		getFriendsActivity.mockReturnValue(of([friend]));

		await renderActivity();

		const link = screen.getByRole("link", { name: /Ada Lovelace/ });
		expect(link).toHaveAttribute("href", "/user/ada");
		expect(within(link).getByText("Completed")).toBeInTheDocument();
		expect(within(link).getByText("4.5")).toBeInTheDocument();
	});

	it("omits the rating of a friend who did not rate the game", async () => {
		getFriendsActivity.mockReturnValue(
			of([{ ...friend, userRating: null }])
		);

		await renderActivity();

		const link = screen.getByRole("link", { name: /Ada Lovelace/ });
		expect(within(link).queryByText("star")).not.toBeInTheDocument();
		expect(link.textContent).not.toMatch(/\d\.\d/);
	});

	it("shows other players linking to their profile with the status in the tooltip", async () => {
		getPlayers.mockReturnValue(of([player]));

		await renderActivity();

		const link = screen.getByRole("link", { name: /Grace Hopper/ });
		expect(link).toHaveAttribute("href", "/user/grace");
		expect(link).toHaveAttribute("title", "Grace Hopper — Playing");
	});

	it("keeps the friends section when only players fail to arrive", async () => {
		const pendingPlayers = new Subject<never[]>();
		getFriendsActivity.mockReturnValue(of([friend]));
		getPlayers.mockReturnValue(pendingPlayers);

		await renderActivity();

		expect(
			screen.getByRole("heading", { name: "Played by Friends" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Other Players" })
		).not.toBeInTheDocument();
	});

	it("reloads and clears the previous game when the game changes", async () => {
		getFriendsActivity.mockReturnValue(of([friend]));
		const view = await renderActivity("g1");
		expect(screen.getByRole("link", { name: /Ada/ })).toBeInTheDocument();

		getFriendsActivity.mockReturnValue(of([]));
		view.fixture.componentRef.setInput("gameId", "g2");
		view.fixture.detectChanges();

		expect(getFriendsActivity).toHaveBeenLastCalledWith("g2");
		expect(
			screen.queryByRole("link", { name: /Ada/ })
		).not.toBeInTheDocument();
	});
});
