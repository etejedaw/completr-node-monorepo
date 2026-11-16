import {
	computed,
	DestroyRef,
	inject,
	type Signal,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { type CompilationItemInput } from "../../../core/services/games.model";
import { ToastService } from "../../../core/services/toast";
import {
	type CompilationRow,
	type CompilationRowMode
} from "./admin-game-editor.model";
import { previewSlug } from "./game-slug-preview";

const MAX_ROWS = 50;
const MIN_ROWS = 1;
const RATE_LIMITED_STATUS = 429;
const INITIAL_EMPTY_ROWS = 2;

let nextRowId = 0;

function makeEmptyRow(mode: CompilationRowMode): CompilationRow {
	return {
		id: `compilation-row-${nextRowId++}`,
		mode,
		title: "",
		linkedGame: null,
		focus: null
	};
}

function toItems(
	rows: CompilationRow[],
	ownId: string
): { items: CompilationItemInput[] } | { error: string } {
	const items: CompilationItemInput[] = [];
	for (const row of rows) {
		if (row.mode === "link") {
			if (!row.linkedGame)
				return { error: "All linked rows must have a selected game." };
			if (row.linkedGame.id === ownId)
				return { error: "A compilation can't contain itself." };
			items.push({ mode: "link", gameId: row.linkedGame.id });
			continue;
		}
		const title = row.title.trim();
		if (!title) return { error: "All create rows must have a title." };
		if (!previewSlug(title))
			return {
				error: "Created titles need letters or numbers to build a slug."
			};
		items.push({ mode: "create", title });
	}
	const linkedIds = items.flatMap(item =>
		item.mode === "link" ? [item.gameId] : []
	);
	if (new Set(linkedIds).size !== linkedIds.length)
		return { error: "Linked games must be unique." };
	const createSlugs = items.flatMap(item =>
		item.mode === "create" ? [previewSlug(item.title)] : []
	);
	if (new Set(createSlugs).size !== createSlugs.length)
		return { error: "Created titles must produce unique slugs." };
	return { items };
}

function saveFailureMessage(err: {
	status?: number;
	error?: { type?: string };
}): string {
	if (err.status === RATE_LIMITED_STATUS)
		return "Rate limit reached. Compilation was NOT saved. Try again in a moment.";
	if (err.error?.type === "GAME_UNIQUE_CONSTRAINT")
		return "A new title collides with an existing game code.";
	if (err.error?.type === "GAME_COMPILATION_INVALID")
		return "Invalid compilation: duplicates or self-reference.";
	if (err.error?.type === "GAME_NOT_FOUND")
		return "Parent or a linked game not found.";
	return "Failed to save compilation.";
}

export function injectGameCompilation(
	game: Signal<Game | null>,
	onChanged: () => void
) {
	const gamesService = inject(GamesService);
	const toast = inject(ToastService);
	const destroyRef = inject(DestroyRef);

	const open = signal(false);
	const saving = signal(false);
	const clearing = signal(false);
	const error = signal("");
	const rows = signal<CompilationRow[]>([]);
	const excludedIds = computed(() => {
		const current = rows();
		const ownId = game()?.id;
		return new Map(
			current.map(row => [
				row.id,
				[
					...(ownId ? [ownId] : []),
					...current
						.filter(
							other => other.id !== row.id && other.linkedGame
						)
						.map(other => other.linkedGame!.id)
				]
			])
		);
	});

	function patchRow(rowId: string, patch: Partial<CompilationRow>) {
		rows.update(list =>
			list.map(row => (row.id === rowId ? { ...row, ...patch } : row))
		);
	}

	function openModal() {
		const current = game();
		if (!current || open()) return;
		error.set("");
		const existing = (current.compilationItems ?? [])
			.filter(item => item.game)
			.map(item => ({
				...makeEmptyRow("link"),
				linkedGame: {
					id: item.game!.id,
					title: item.game!.title,
					code: item.game!.code,
					coverUrl: item.game!.coverUrl,
					backgroundUrl: item.game!.backgroundUrl
				} as Game
			}));
		rows.set(
			existing.length > 0
				? existing
				: Array.from({ length: INITIAL_EMPTY_ROWS }, () =>
						makeEmptyRow("link")
					)
		);
		open.set(true);
	}

	function closeModal() {
		if (saving() || clearing()) return;
		open.set(false);
	}

	function addRow() {
		if (rows().length >= MAX_ROWS) return;
		error.set("");
		rows.update(list => [...list, makeEmptyRow("link")]);
	}

	function removeRow(index: number) {
		const row = rows()[index];
		if (!row || rows().length <= MIN_ROWS) return;
		error.set("");
		rows.update(list => list.filter(r => r.id !== row.id));
	}

	function setRowMode(index: number, mode: CompilationRowMode) {
		const row = rows()[index];
		if (!row || row.mode === mode) return;
		error.set("");
		patchRow(row.id, { mode, title: "", linkedGame: null, focus: null });
	}

	function updateRowTitle(index: number, value: string) {
		const row = rows()[index];
		if (!row) return;
		error.set("");
		patchRow(row.id, { title: value });
	}

	function pickRowGame(index: number, picked: Game) {
		const row = rows()[index];
		if (!row || row.mode !== "link") return;
		error.set("");
		patchRow(row.id, { linkedGame: picked, focus: "selected" });
	}

	function clearRowGame(index: number) {
		const row = rows()[index];
		if (!row) return;
		error.set("");
		patchRow(row.id, { linkedGame: null, focus: "search" });
	}

	function submit() {
		const current = game();
		if (!current || saving()) return;
		const built = toItems(rows(), current.id);
		if ("error" in built) {
			error.set(built.error);
			return;
		}

		saving.set(true);
		error.set("");
		gamesService
			.setCompilationItems(current.id, { items: built.items })
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => {
					saving.set(false);
					open.set(false);
					toast.success("Compilation saved.");
					onChanged();
				},
				error: err => {
					saving.set(false);
					error.set(saveFailureMessage(err));
				}
			});
	}

	function clear() {
		const current = game();
		if (!current || clearing()) return;
		clearing.set(true);
		error.set("");
		gamesService
			.clearCompilation(current.id)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: () => {
					clearing.set(false);
					open.set(false);
					toast.success("Compilation cleared.");
					onChanged();
				},
				error: () => {
					clearing.set(false);
					error.set("Failed to clear compilation.");
				}
			});
	}

	return {
		open,
		saving,
		clearing,
		error,
		rows,
		excludedIds,
		openModal,
		closeModal,
		addRow,
		removeRow,
		setRowMode,
		updateRowTitle,
		pickRowGame,
		clearRowGame,
		submit,
		clear
	};
}
