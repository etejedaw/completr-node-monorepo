import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { form, FormField, required } from "@angular/forms/signals";
import { injectDialogRef } from "ng-primitives/dialog";

import { type Game, type GameShelfEntry } from "../../../core/models";
import {
	ChipGroup,
	type ChipOption
} from "../../../shared/components/chip-group/chip-group";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
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
	UiInput,
	UiTextarea
} from "../../../shared/ui";
import { injectGameSearch } from "../../games/game-search";
import {
	type CreateGameShelfDto,
	GameShelfService,
	type UpdateGameShelfDto
} from "../game-shelf";

export interface GameShelfModalData {
	entry: GameShelfEntry | null;
	preselectedGame: Game | null;
}
export type GameShelfModalResult = "saved";

const EDITION_SUGGESTIONS = [
	"Standard",
	"Deluxe",
	"GOTY",
	"Collector's",
	"Definitive",
	"Complete",
	"Digital",
	"Physical"
];

@Component({
	selector: "app-game-shelf-modal",
	imports: [
		UiAlert,
		ChipGroup,
		DatePipe,
		DialogDeleteAction,
		FormField,
		GamePoster,
		GameSearchStep,
		OptionPicker,
		SelectedGameRow,
		UiButton,
		UiDialog,
		UiInput,
		UiTextarea
	],
	templateUrl: "./game-shelf-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfModal implements OnInit {
	private readonly shelfService = inject(GameShelfService);
	private readonly dialogRef = injectDialogRef<
		GameShelfModalData,
		GameShelfModalResult
	>();
	protected readonly entry = this.dialogRef.data.entry;
	protected readonly preselectedGame = this.dialogRef.data.preselectedGame;

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly selectedGame = signal<Game | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly search = injectGameSearch(
		this.searchQuery,
		signal(true)
	);
	protected readonly returnedToSearch = signal(false);
	protected readonly platformOptions = computed<PickerOption[]>(() =>
		(this.selectedGame()?.platforms ?? []).map(platform => ({
			value: platform.id,
			label: platform.name,
			icon: "sports_esports"
		}))
	);
	protected readonly isEdit = signal(false);
	protected readonly viewMode = signal<"summary" | "edit">("edit");
	protected readonly heading = computed(() => {
		if (!this.isEdit()) return "Add to My Shelf";
		return this.viewMode() === "summary"
			? this.entry!.game.title
			: "Edit shelf entry";
	});
	protected readonly isSearchStep = computed(
		() => !this.isEdit() && !this.selectedGame()
	);
	protected readonly subheading = computed(() => {
		if (this.isSearchStep()) return "Search the catalog for a game you own";
		return this.isEdit() && this.viewMode() === "edit"
			? this.entry!.game.title
			: null;
	});

	switchToEdit() {
		this.viewMode.set("edit");
	}

	protected readonly model = signal({
		gameId: "",
		platformId: "",
		edition: "",
		acquiredAt: "",
		notes: ""
	});

	readonly form = form(this.model, path => {
		required(path.gameId);
		required(path.platformId);
	});

	protected readonly editionChipOptions: readonly ChipOption[] =
		EDITION_SUGGESTIONS.map(suggestion => ({
			value: suggestion,
			label: suggestion
		}));

	applyEditionSuggestion(value: string | undefined) {
		if (value) this.model.update(m => ({ ...m, edition: value }));
	}

	ngOnInit() {
		const e = this.entry;
		if (e) {
			this.isEdit.set(true);
			this.viewMode.set("summary");
			this.selectedGame.set({
				id: e.game.id,
				title: e.game.title,
				backgroundUrl: e.game.backgroundUrl
			} as Game);
			this.model.set({
				gameId: e.game.id,
				platformId: e.platform.id,
				edition: e.edition ?? "",
				acquiredAt: e.acquiredAt ? e.acquiredAt.substring(0, 10) : "",
				notes: e.notes ?? ""
			});
		}

		const pg = this.preselectedGame;
		if (pg && !this.isEdit()) {
			this.selectGame(pg);
		}
	}

	selectGame(game: Game) {
		this.selectedGame.set(game);
		const platforms = game.platforms ?? [];
		this.model.update(m => ({
			...m,
			gameId: game.id,
			platformId: platforms.length === 1 ? platforms[0].id : ""
		}));
	}

	setPlatform(platformId: string) {
		this.model.update(m => ({ ...m, platformId }));
	}

	clearGame() {
		this.selectedGame.set(null);
		this.model.update(m => ({ ...m, gameId: "", platformId: "" }));
		this.returnedToSearch.set(true);
	}

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) return;
		this.isLoading.set(true);
		this.error.set("");

		const val = this.form().value();

		if (this.isEdit()) {
			const dto: UpdateGameShelfDto = {
				edition: val.edition || null,
				acquiredAt: val.acquiredAt || null,
				notes: val.notes || null
			};
			this.shelfService.update(this.entry!.id, dto).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Update failed");
				}
			});
		} else {
			const dto: CreateGameShelfDto = {
				gameId: val.gameId!,
				platformId: val.platformId!,
				edition: val.edition || undefined,
				acquiredAt: val.acquiredAt || undefined,
				notes: val.notes || undefined
			};
			this.shelfService.create(dto).subscribe({
				next: () => this.dialogRef.close("saved"),
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Creation failed");
				}
			});
		}
	}

	onDelete() {
		this.isLoading.set(true);
		this.shelfService.delete(this.entry!.id).subscribe({
			next: () => this.dialogRef.close("saved"),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	onClose() {
		this.dialogRef.close();
	}
}
