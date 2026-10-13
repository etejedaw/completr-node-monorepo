import { assertInInjectionContext, inject } from "@angular/core";

import { type BacklogEntry, type Game } from "../../core/models";
import { DialogService } from "../../core/services/dialog";
import { GamesService } from "../games/games";
import { BacklogService } from "./backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "./backlog-modal/backlog-modal";

export interface BacklogQuickAddGame {
	id: string;
	code: string;
}

export function injectBacklogQuickAdd(onSaved: () => void) {
	assertInInjectionContext(injectBacklogQuickAdd);
	const backlogService = inject(BacklogService);
	const gamesService = inject(GamesService);
	const dialogs = inject(DialogService);

	const openBacklogModal = (
		entry: BacklogEntry | null,
		preselectedGame: Game | null
	) => {
		const ref = dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame,
					preselectedCompilationParent: null,
					preselectAddToQueue: false
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") onSaved();
		});
	};

	const openCreateFor = (code: string) =>
		gamesService
			.getByCode(code)
			.subscribe(game => openBacklogModal(null, game));

	return (game: BacklogQuickAddGame) =>
		backlogService.getMyBacklog({ game_id: game.id }).subscribe({
			next: res => {
				const existing = res.data.backlog[0] ?? null;
				if (existing) openBacklogModal(existing, null);
				else openCreateFor(game.code);
			},
			error: () => openCreateFor(game.code)
		});
}
