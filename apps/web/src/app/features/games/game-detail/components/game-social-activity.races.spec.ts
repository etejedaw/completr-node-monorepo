import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { of, Subject } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { GamesService } from "../../../../core/services/games";
import { GameSocialActivity } from "./game-social-activity";

const player = (username: string) => ({
	username,
	name: username,
	avatarUrl: null,
	role: "user",
	status: "playing"
});

describe("GameSocialActivity response ordering", () => {
	it("drops a late answer for the previous game", async () => {
		const slowPlayers = new Subject<ReturnType<typeof player>[]>();
		const getPlayers = vi
			.fn()
			.mockImplementation((gameId: string) =>
				gameId === "g1" ? slowPlayers : of([player("currentplayer")])
			);
		const { fixture } = await render(GameSocialActivity, {
			providers: [
				provideRouter([]),
				{
					provide: GamesService,
					useValue: {
						getFriendsActivity: vi.fn().mockReturnValue(of([])),
						getPlayers
					}
				},
				{ provide: AuthService, useValue: { isLoggedIn: signal(true) } }
			],
			inputs: { gameId: "g1" }
		});

		fixture.componentRef.setInput("gameId", "g2");
		fixture.detectChanges();
		await fixture.whenStable();
		slowPlayers.next([player("staleplayer")]);

		expect(screen.getByText("currentplayer")).toBeInTheDocument();
		expect(screen.queryByText("staleplayer")).not.toBeInTheDocument();
	});
});
