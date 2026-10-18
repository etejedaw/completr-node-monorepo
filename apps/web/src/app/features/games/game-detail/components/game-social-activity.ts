import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogStatus, type UserRole } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth";
import { avatarRing } from "../../../../core/utils/premium";
import { UiAvatar } from "../../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusFillClass,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { GamesService } from "../../games";

interface FriendActivity {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
	status: BacklogStatus;
	finishedAt: string | null;
	userRating: number | null;
}

interface OtherPlayer {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
	status: BacklogStatus;
}

@Component({
	selector: "app-game-social-activity",
	imports: [RouterLink, UiAvatar],
	templateUrl: "./game-social-activity.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameSocialActivity {
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);

	readonly gameId = input.required<string>();

	protected readonly friends = signal<FriendActivity[]>([]);
	protected readonly players = signal<OtherPlayer[]>([]);

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusLabel = backlogStatusLabel;
	protected readonly statusFillClass = backlogStatusFillClass;
	protected readonly avatarRing = avatarRing;

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
}
