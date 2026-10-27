import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";
import { forkJoin, map } from "rxjs";

import {
	type BacklogEntry,
	type Game,
	type GamePlatinum,
	type Platform
} from "../../../core/models";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import { GameSearchStep } from "../../../shared/components/game-search/game-search-step";
import { SelectedGameRow } from "../../../shared/components/game-search/selected-game-row";
import {
	OptionPicker,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiInput,
	UiSkeleton,
	UiTextarea
} from "../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { BacklogService } from "../../backlog/backlog";
import { injectGameSearch } from "../../games/game-search";
import { GamesService } from "../../games/games";
import { PlatinumService } from "../platinum";

export const PLATINUM_NOTES_MAX_LENGTH = 500;

export interface PlatinumDialogGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
	platforms: Platform[];
}

export interface PlatinumContext {
	game: PlatinumDialogGame;
	runs: BacklogEntry[];
	platinum: GamePlatinum | null;
}

export interface PlatinumDialogData {
	context?: PlatinumContext;
	game?: { id: string; code: string };
}

export type PlatinumDialogResult = { platinum: GamePlatinum } | "removed";

type PlatinumDialogStep = "search" | "loading" | "load-error" | "form";

const NO_SELECTION = "";

@Component({
	selector: "app-platinum-dialog",
	imports: [
		DialogDeleteAction,
		GameSearchStep,
		OptionPicker,
		SelectedGameRow,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiInput,
		UiSkeleton,
		UiTextarea
	],
	templateUrl: "./platinum-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumDialog {
	private readonly dialogRef = injectDialogRef<
		PlatinumDialogData,
		PlatinumDialogResult
	>();
	private readonly platinumService = inject(PlatinumService);
	private readonly gamesService = inject(GamesService);
	private readonly backlogService = inject(BacklogService);

	private readonly data = this.dialogRef.data;
	protected readonly picksGame = !this.data.context && !this.data.game;
	protected readonly notesMaxLength = PLATINUM_NOTES_MAX_LENGTH;

	protected readonly step = signal<PlatinumDialogStep>("search");
	protected readonly context = signal<PlatinumContext | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly search = injectGameSearch(
		this.searchQuery,
		signal(true)
	);
	protected readonly returnedToSearch = signal(false);

	protected readonly backlogId = signal(NO_SELECTION);
	protected readonly platformId = signal(NO_SELECTION);
	protected readonly platinumedAt = signal("");
	protected readonly notes = signal("");
	protected readonly saving = signal(false);
	protected readonly removing = signal(false);
	protected readonly saveError = signal("");

	protected readonly isEdit = computed(() => !!this.context()?.platinum);
	protected readonly runs = computed(() => this.context()?.runs ?? []);

	protected readonly heading = computed(() => {
		if (this.step() === "search") return "Add a platinum";
		return this.isEdit() ? "Edit platinum" : "Mark as platinumed";
	});

	protected readonly subheading = computed(() => {
		if (this.step() === "search")
			return "Search the catalog for the game you platinumed";
		return this.picksGame ? null : (this.context()?.game.title ?? null);
	});

	protected readonly runOptions = computed<readonly PickerOption[]>(() => {
		const runs = this.runs();
		return [
			{ value: NO_SELECTION, label: "No specific run", icon: "remove" },
			...runs.map((run, index) => ({
				value: run.id,
				label: `Run #${runs.length - index} · ${backlogStatusLabel(run.status)}`,
				hint: run.platform.abbreviation,
				icon: backlogStatusIcon(run.status),
				iconClass: backlogStatusIconColor(run.status)
			}))
		];
	});

	protected readonly platformOptions = computed<readonly PickerOption[]>(
		() => {
			const platforms = [...(this.context()?.game.platforms ?? [])];
			for (const run of this.runs()) {
				if (!platforms.some(p => p.id === run.platform.id))
					platforms.push({
						id: run.platform.id,
						name: run.platform.abbreviation,
						code: run.platform.id,
						abbreviation: run.platform.abbreviation
					});
			}
			return [
				{ value: NO_SELECTION, label: "Not specified", icon: "remove" },
				...platforms.map(platform => ({
					value: platform.id,
					label: platform.name,
					icon: "sports_esports"
				}))
			];
		}
	);

	protected readonly busy = computed(() => this.saving() || this.removing());

	constructor() {
		if (this.data.context) this.applyContext(this.data.context);
		else if (this.data.game) this.loadContext(this.data.game);
	}

	protected pickGame(game: Game) {
		this.loadContext(game);
	}

	protected changeGame() {
		this.context.set(null);
		this.saveError.set("");
		this.returnedToSearch.set(true);
		this.step.set("search");
	}

	protected retryLoad() {
		const game = this.data.game;
		if (game) this.loadContext(game);
	}

	protected selectRun(backlogId: string) {
		this.backlogId.set(backlogId);
		const run = this.runs().find(r => r.id === backlogId);
		if (run && !this.platformId()) this.platformId.set(run.platform.id);
	}

	protected save() {
		const context = this.context();
		if (!context || this.busy()) return;
		this.saving.set(true);
		this.saveError.set("");
		this.platinumService
			.save(context.game.id, {
				backlogId: this.backlogId() || null,
				platformId: this.platformId() || null,
				platinumedAt: this.platinumedAt() || null,
				notes: this.notes().trim() || null
			})
			.subscribe({
				next: platinum => this.dialogRef.close({ platinum }),
				error: () => {
					this.saving.set(false);
					this.saveError.set(
						"The platinum could not be saved. Try again."
					);
				}
			});
	}

	protected remove() {
		const context = this.context();
		if (!context || this.busy()) return;
		this.removing.set(true);
		this.saveError.set("");
		this.platinumService.remove(context.game.id).subscribe({
			next: () => this.dialogRef.close("removed"),
			error: () => {
				this.removing.set(false);
				this.saveError.set(
					"The platinum could not be removed. Try again."
				);
			}
		});
	}

	protected close() {
		this.dialogRef.close();
	}

	private loadContext(game: { id: string; code: string }) {
		this.step.set("loading");
		forkJoin({
			game: this.gamesService.getByCode(game.code),
			runs: this.backlogService
				.getMyBacklog({ game_id: game.id })
				.pipe(map(res => res.data.backlog))
		}).subscribe({
			next: ({ game: fullGame, runs }) =>
				this.applyContext({
					game: {
						id: fullGame.id,
						code: fullGame.code,
						title: fullGame.title,
						backgroundUrl: fullGame.backgroundUrl,
						platforms: fullGame.platforms ?? []
					},
					runs,
					platinum: fullGame.userPlatinum ?? null
				}),
			error: () => this.step.set("load-error")
		});
	}

	private applyContext(context: PlatinumContext) {
		this.context.set(context);
		this.backlogId.set(context.platinum?.backlogId ?? NO_SELECTION);
		this.platformId.set(context.platinum?.platformId ?? NO_SELECTION);
		this.platinumedAt.set(context.platinum?.platinumedAt ?? "");
		this.notes.set(context.platinum?.notes ?? "");
		this.step.set("form");
	}
}
