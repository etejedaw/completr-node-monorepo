import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../../../core/services/auth";
import { GamesService } from "../../games";

interface FriendActivity {
	username: string;
	name: string;
	avatarUrl: string | null;
	status: string;
	finishedAt: string | null;
	userRating: number | null;
}

interface OtherPlayer {
	username: string;
	name: string;
	avatarUrl: string | null;
	status: string;
}

interface StatusMeta {
	label: string;
	classes: string;
	dot: string;
}

@Component({
	selector: "app-game-social-activity",
	imports: [RouterLink],
	templateUrl: "./game-social-activity.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameSocialActivity {
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);

	readonly gameId = input.required<string>();

	protected readonly friends = signal<FriendActivity[]>([]);
	protected readonly players = signal<OtherPlayer[]>([]);

	constructor() {
		effect(() => {
			const id = this.gameId();
			this.friends.set([]);
			this.players.set([]);
			if (!id || !this.authService.isLoggedIn()) return;
			this.gamesService
				.getFriendsActivity(id)
				.subscribe(f => this.friends.set(f));
			this.gamesService
				.getPlayers(id)
				.subscribe(p => this.players.set(p));
		});
	}

	protected statusMeta(status: string): StatusMeta {
		switch (status) {
			case "completed":
				return {
					label: "Completed",
					classes: "bg-success/15 text-success",
					dot: "bg-success"
				};
			case "playing":
				return {
					label: "Playing",
					classes: "bg-brand/15 text-brand",
					dot: "bg-brand"
				};
			case "abandoned":
				return {
					label: "Abandoned",
					classes: "bg-warning/15 text-warning",
					dot: "bg-warning"
				};
			case "endless":
				return {
					label: "Endless",
					classes: "bg-brand-subtle text-brand",
					dot: "bg-brand"
				};
			default:
				return {
					label: "Backlog",
					classes: "bg-input-bg text-fg-muted",
					dot: "bg-fg-muted"
				};
		}
	}

	hasContent(): boolean {
		return this.friends().length > 0 || this.players().length > 0;
	}
}
