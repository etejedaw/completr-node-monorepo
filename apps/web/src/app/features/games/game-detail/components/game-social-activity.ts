import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { type Subscription } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { avatarRing } from "../../../../core/utils/premium";
import { BacklogStatusBadge } from "../../../../shared/components/backlog-status-badge/backlog-status-badge";
import { UiAvatar } from "../../../../shared/ui";
import {
	backlogStatusFillClass,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { GamesService } from "../../games";
import {
	type FriendActivity,
	type OtherPlayer
} from "./game-social-activity.model";

@Component({
	selector: "app-game-social-activity",
	imports: [RouterLink, UiAvatar, BacklogStatusBadge],
	templateUrl: "./game-social-activity.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameSocialActivity {
	private readonly gamesService = inject(GamesService);
	private readonly authService = inject(AuthService);

	readonly gameId = input.required<string>();

	protected readonly friends = signal<FriendActivity[]>([]);
	protected readonly players = signal<OtherPlayer[]>([]);

	protected readonly statusLabel = backlogStatusLabel;
	protected readonly statusFillClass = backlogStatusFillClass;
	protected readonly avatarRing = avatarRing;

	private requests: Subscription[] = [];

	constructor() {
		inject(DestroyRef).onDestroy(() => this.cancelRequests());
		effect(() => {
			const id = this.gameId();
			this.cancelRequests();
			this.friends.set([]);
			this.players.set([]);
			if (!id || !this.authService.isLoggedIn()) return;
			this.requests = [
				this.gamesService
					.getFriendsActivity(id)
					.subscribe(f => this.friends.set(f)),
				this.gamesService
					.getPlayers(id)
					.subscribe(p => this.players.set(p))
			];
		});
	}

	private cancelRequests() {
		this.requests.forEach(request => request.unsubscribe());
		this.requests = [];
	}
}
