import { DestroyRef, inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { type Game } from "../../../core/models";
import { ToastService } from "../../../core/services/toast";
import { GamesService } from "../games";
import { previewSlug } from "./game-slug-preview";

const MAX_VARIANTS = 10;
const MIN_VARIANTS = 2;
const RATE_LIMITED_STATUS = 429;

function emptyVariants() {
	return [
		{ title: "", variant: "" },
		{ title: "", variant: "" }
	];
}

function validationMessage(
	variants: { title: string; variant: string }[]
): string | null {
	if (variants.some(v => !v.title || !v.variant))
		return "All variants need a title and a variant label.";
	if (variants.some(v => !previewSlug(v.title)))
		return "Variant titles need letters or numbers to build a slug.";
	const titles = new Set(variants.map(v => previewSlug(v.title)));
	if (titles.size !== variants.length)
		return "Variant titles must be unique.";
	const labels = new Set(variants.map(v => v.variant.toLowerCase()));
	if (labels.size !== variants.length)
		return "Variant labels must be unique.";
	return null;
}

function failureMessage(err: {
	status?: number;
	error?: { type?: string };
}): string {
	if (err.status === RATE_LIMITED_STATUS)
		return "Rate limit reached. Split was NOT applied. Try again in a moment.";
	if (err.error?.type === "GAME_UNIQUE_CONSTRAINT")
		return "A target title produces a slug already used by another game, possibly an inactive one. Use unique titles.";
	if (err.error?.type === "GAME_SPLIT_INVALID")
		return "Invalid split request.";
	return "Failed to split the game.";
}

export function injectGameSplit(
	game: Signal<Game | null>,
	onSplit: (firstVariant: Game) => void
) {
	const gamesService = inject(GamesService);
	const toast = inject(ToastService);
	const destroyRef = inject(DestroyRef);

	const open = signal(false);
	const splitting = signal(false);
	const error = signal("");
	const variants =
		signal<{ title: string; variant: string }[]>(emptyVariants());

	function openModal() {
		const current = game();
		if (!current || open()) return;
		error.set("");
		variants.set([
			{ title: current.title, variant: current.variant ?? "" },
			{ title: "", variant: "" }
		]);
		open.set(true);
	}

	function closeModal() {
		if (splitting()) return;
		open.set(false);
	}

	function addVariant() {
		if (variants().length >= MAX_VARIANTS) return;
		error.set("");
		variants.update(list => [...list, { title: "", variant: "" }]);
	}

	function removeVariant(index: number) {
		if (variants().length <= MIN_VARIANTS) return;
		error.set("");
		variants.update(list => list.filter((_, i) => i !== index));
	}

	function updateVariantTitle(index: number, value: string) {
		error.set("");
		variants.update(list =>
			list.map((v, i) => (i === index ? { ...v, title: value } : v))
		);
	}

	function updateVariantLabel(index: number, value: string) {
		error.set("");
		variants.update(list =>
			list.map((v, i) => (i === index ? { ...v, variant: value } : v))
		);
	}

	function submit() {
		const current = game();
		if (!current || splitting()) return;
		const cleaned = variants().map(v => ({
			title: v.title.trim(),
			variant: v.variant.trim()
		}));
		const invalid = validationMessage(cleaned);
		if (invalid) {
			error.set(invalid);
			return;
		}

		splitting.set(true);
		error.set("");
		gamesService
			.splitGame(current.id, { variants: cleaned })
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: games => {
					splitting.set(false);
					open.set(false);
					if (games.length > 0) {
						toast.success(`Split into ${games.length} variants.`);
						onSplit(games[0]);
					}
				},
				error: err => {
					splitting.set(false);
					error.set(failureMessage(err));
				}
			});
	}

	return {
		open,
		splitting,
		error,
		variants,
		openModal,
		closeModal,
		addVariant,
		removeVariant,
		updateVariantTitle,
		updateVariantLabel,
		submit
	};
}
