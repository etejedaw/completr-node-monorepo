import { computed, inject, signal } from "@angular/core";

import { type BacklogEntry, type BulkResult } from "../../core/models";
import { type BulkAction } from "../../shared/components/bulk-action-bar/bulk-action-bar.model";
import {
	canAddToQueue,
	canChangeStatus,
	canRate,
	uniqueGameIds
} from "../../shared/utils/backlog-eligibility";
import { countOf } from "../../shared/utils/bulk-feedback";
import { injectBulkRemoval } from "../../shared/utils/bulk-removal";
import { injectBulkRunner } from "../../shared/utils/bulk-runner";
import { injectRowSelection } from "../../shared/utils/row-selection";
import { FavoritesService } from "../favorites/favorites";
import { QueueService } from "../queue/queue";
import { BacklogService } from "./backlog";
import { type BacklogBulkChanges } from "./backlog.model";
import {
	type BacklogBulkActionsOptions,
	type BacklogBulkDialog
} from "./backlog-bulk-actions.model";
import { type BulkStatusChange } from "./components/bulk-status-dialog/bulk-status-dialog.model";

export const BACKLOG_BULK_NOUN = { one: "run", other: "runs" };
const GAME_NOUN = { one: "game", other: "games" };

export function bulkStatusChanges(
	change: BulkStatusChange
): BacklogBulkChanges {
	const changes: BacklogBulkChanges = { status: change.status };
	if (!change.date) return changes;
	if (change.status === "playing") changes.startedAt = change.date;
	if (change.status === "completed" || change.status === "abandoned")
		changes.finishedAt = change.date;
	return changes;
}

function withChanges(
	entry: BacklogEntry,
	changes: BacklogBulkChanges
): BacklogEntry {
	const next: BacklogEntry = { ...entry };
	if (changes.status !== undefined) next.status = changes.status;
	if (changes.startedAt) next.startedAt = changes.startedAt;
	if (changes.finishedAt) next.finishedAt = changes.finishedAt;
	if (changes.userRating != null) next.userRating = changes.userRating;
	if (changes.isPublic !== undefined) next.isPublic = changes.isPublic;
	return next;
}

export function injectBacklogBulkActions(options: BacklogBulkActionsOptions) {
	const backlogService = inject(BacklogService);
	const queueService = inject(QueueService);
	const favoritesService = inject(FavoritesService);

	const selection = injectRowSelection(options.entries, entry => entry.id);
	const runner = injectBulkRunner(selection);
	const removal = injectBulkRemoval<BacklogEntry>({
		rows: options.entries,
		total: options.total,
		selection,
		keyOf: entry => entry.id,
		requestIdOf: entry => entry.id,
		request: ids => backlogService.bulk("delete", { ids }),
		pendingMessage: count => `${countOf(count, BACKLOG_BULK_NOUN)} deleted`,
		failureMessage: "Couldn't delete the selected runs. Try again."
	});

	const dialog = signal<BacklogBulkDialog | null>(null);

	const selected = selection.selectedRows;
	const statusEligible = computed(() => selected().filter(canChangeStatus));
	const rateEligible = computed(() => selected().filter(canRate));
	const queueAddEligible = computed(() =>
		selected().filter(entry => canAddToQueue(entry, options.queuedIds()))
	);
	const queueRemoveEligible = computed(() =>
		selected().filter(entry => options.queuedIds().has(entry.id))
	);
	const selectedGameIds = computed(() => uniqueGameIds(selected()));
	const favoriteEligible = computed(() => {
		const favorites = favoritesService.favoriteIds();
		return selectedGameIds().filter(id => !favorites.has(id));
	});
	const unfavoriteEligible = computed(() => {
		const favorites = favoritesService.favoriteIds();
		return selectedGameIds().filter(id => favorites.has(id));
	});
	const publicEligible = computed(() =>
		selected().filter(entry => !entry.isPublic)
	);
	const privateEligible = computed(() =>
		selected().filter(entry => entry.isPublic)
	);

	const statusSkipped = computed(
		() => selected().length - statusEligible().length
	);
	const rateSkipped = computed(
		() => selected().length - rateEligible().length
	);
	const alreadyRated = computed(
		() => rateEligible().filter(entry => entry.userRating != null).length
	);
	const queuedAmongStatusEligible = computed(
		() =>
			statusEligible().filter(entry => options.queuedIds().has(entry.id))
				.length
	);

	const actions = computed<BulkAction[]>(() => {
		const allFavorites =
			selectedGameIds().length > 0 && favoriteEligible().length === 0;
		const allQueued =
			queueRemoveEligible().length > 0 && queueAddEligible().length === 0;
		const list: BulkAction[] = [
			{
				id: "status",
				label: "Change status",
				icon: "swap_horiz",
				eligibleCount: statusEligible().length,
				tone: "default"
			},
			{
				id: "rate",
				label: "Rate",
				icon: "star",
				eligibleCount: rateEligible().length,
				tone: "default"
			},
			allFavorites
				? {
						id: "unfavorite",
						label: "Unfavorite",
						icon: "heart_broken",
						eligibleCount: unfavoriteEligible().length,
						tone: "default"
					}
				: {
						id: "favorite",
						label: "Favorite",
						icon: "favorite",
						eligibleCount: favoriteEligible().length,
						tone: "default"
					},
			allQueued
				? {
						id: "queue-remove",
						label: "Remove from Up Next",
						icon: "playlist_remove",
						eligibleCount: queueRemoveEligible().length,
						tone: "default"
					}
				: {
						id: "queue-add",
						label: "Add to Up Next",
						icon: "playlist_add",
						eligibleCount: queueAddEligible().length,
						tone: "default"
					}
		];
		if (!allFavorites && unfavoriteEligible().length > 0)
			list.push({
				id: "unfavorite",
				label: "Unfavorite",
				icon: "heart_broken",
				eligibleCount: unfavoriteEligible().length,
				tone: "default",
				overflow: true
			});
		if (!allQueued && queueRemoveEligible().length > 0)
			list.push({
				id: "queue-remove",
				label: "Remove from Up Next",
				icon: "playlist_remove",
				eligibleCount: queueRemoveEligible().length,
				tone: "default",
				overflow: true
			});
		list.push(
			{
				id: "public",
				label: "Make public",
				icon: "public",
				eligibleCount: publicEligible().length,
				tone: "default",
				overflow: true
			},
			{
				id: "private",
				label: "Make private",
				icon: "lock",
				eligibleCount: privateEligible().length,
				tone: "default",
				overflow: true
			},
			{
				id: "delete",
				label: "Delete runs",
				icon: "delete",
				eligibleCount: selected().length,
				tone: "danger"
			}
		);
		return list;
	});

	function applyChanges(ids: readonly string[], changes: BacklogBulkChanges) {
		const updated = new Set(ids);
		options.entries.update(entries =>
			entries.map(entry =>
				updated.has(entry.id) ? withChanges(entry, changes) : entry
			)
		);
	}

	function rowIdsForGames(gameIds: readonly string[]): string[] {
		const games = new Set(gameIds);
		return selected()
			.filter(entry => games.has(entry.game.id))
			.map(entry => entry.id);
	}

	function updateRuns(
		entries: readonly BacklogEntry[],
		changes: BacklogBulkChanges,
		successVerb: string
	) {
		if (entries.length === 0) return;
		runner.run({
			request: backlogService.bulk("update", {
				ids: entries.map(entry => entry.id),
				changes
			}),
			applied: result => {
				applyChanges(result.succeeded, changes);
				if (result.queueRemoved.length > 0) options.reloadQueue();
			},
			successMessage: count =>
				`${countOf(count, BACKLOG_BULK_NOUN)} ${successVerb}`,
			partialVerb: "updated",
			failureMessage: "Couldn't update the selected runs. Try again.",
			rowIdsOf: ids => [...ids]
		});
	}

	function updateQueue(action: "add" | "remove") {
		const entries =
			action === "add" ? queueAddEligible() : queueRemoveEligible();
		if (entries.length === 0) return;
		runner.run<BulkResult>({
			request: queueService.bulk(action, {
				backlogIds: entries.map(entry => entry.id)
			}),
			applied: () => options.reloadQueue(),
			successMessage: count =>
				`${countOf(count, BACKLOG_BULK_NOUN)} ${action === "add" ? "added to" : "removed from"} Up Next`,
			partialVerb: action === "add" ? "added" : "removed",
			failureMessage: "Couldn't update Up Next. Try again.",
			rowIdsOf: ids => [...ids]
		});
	}

	function updateFavorites(action: "add" | "remove") {
		const gameIds =
			action === "add" ? favoriteEligible() : unfavoriteEligible();
		if (gameIds.length === 0) return;
		runner.run<BulkResult>({
			request: favoritesService.bulk(action, { gameIds }),
			applied: () => undefined,
			successMessage: count =>
				`${countOf(count, GAME_NOUN)} ${action === "add" ? "added to" : "removed from"} favorites`,
			partialVerb: action === "add" ? "added" : "removed",
			failureMessage: "Couldn't update your favorites. Try again.",
			rowIdsOf: rowIdsForGames
		});
	}

	function trigger(id: string) {
		if (runner.busy() || dialog() !== null) return;
		switch (id) {
			case "status":
				if (statusEligible().length > 0) dialog.set("status");
				return;
			case "rate":
				if (rateEligible().length > 0) dialog.set("rating");
				return;
			case "favorite":
				return updateFavorites("add");
			case "unfavorite":
				return updateFavorites("remove");
			case "queue-add":
				return updateQueue("add");
			case "queue-remove":
				return updateQueue("remove");
			case "public":
				return updateRuns(
					publicEligible(),
					{ isPublic: true },
					"made public"
				);
			case "private":
				return updateRuns(
					privateEligible(),
					{ isPublic: false },
					"made private"
				);
			case "delete":
				return removal.remove(selected());
		}
	}

	function confirmStatus(change: BulkStatusChange) {
		const entries = statusEligible();
		dialog.set(null);
		updateRuns(entries, bulkStatusChanges(change), "updated");
	}

	function confirmRating(rating: number) {
		const entries = rateEligible();
		dialog.set(null);
		updateRuns(entries, { userRating: rating }, "rated");
	}

	return {
		selection,
		actions,
		busy: runner.busy,
		dialog: dialog.asReadonly(),
		statusEligibleCount: computed(() => statusEligible().length),
		statusSkippedCount: statusSkipped,
		queuedAmongStatusEligible,
		rateEligibleCount: computed(() => rateEligible().length),
		rateSkippedCount: rateSkipped,
		alreadyRatedCount: alreadyRated,
		trigger,
		confirmStatus,
		confirmRating,
		closeDialog: () => dialog.set(null),
		withoutPending: removal.withoutPending
	};
}
