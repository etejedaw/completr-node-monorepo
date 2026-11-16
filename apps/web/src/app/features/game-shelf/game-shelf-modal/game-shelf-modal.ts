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

import { type Game } from "../../../core/models";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { GameSearchStep } from "../../../shared/components/game-search/game-search-step";
import { SelectedGameRow } from "../../../shared/components/game-search/selected-game-row";
import { GameArtPipe } from "../../../shared/pipes/game-art";
import {
	UiAlert,
	UiButton,
	UiChipGroup,
	type UiChipOption,
	UiDatePicker,
	UiDialog,
	UiFieldLabel,
	UiFieldOptional,
	UiInput,
	UiOptionPicker,
	type UiPickerOption,
	UiTextarea
} from "../../../shared/ui";
import { injectGameSearch } from "../../../shared/utils/inject-game-search";
import { GameShelfService } from "../game-shelf";
import {
	type CreateGameShelfDto,
	type UpdateGameShelfDto
} from "../game-shelf.model";
import { type GameShelfModalData } from "./game-shelf-modal.model";

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
		UiChipGroup,
		DatePipe,
		DialogDeleteAction,
		FormField,
		GamePoster,
		GameSearchStep,
		UiOptionPicker,
		SelectedGameRow,
		UiButton,
		UiDatePicker,
		UiDialog,
		UiInput,
		UiTextarea,
		UiFieldLabel,
		UiFieldOptional,
		GameArtPipe
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
	protected readonly platformOptions = computed<UiPickerOption[]>(() =>
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

	protected switchToEdit() {
		this.viewMode.set("edit");
	}

	protected readonly model = signal({
		gameId: "",
		platformId: "",
		edition: "",
		acquiredAt: "",
		notes: ""
	});

	protected readonly form = form(this.model, path => {
		required(path.gameId);
		required(path.platformId);
	});

	protected readonly editionChipOptions: readonly UiChipOption[] =
		EDITION_SUGGESTIONS.map(suggestion => ({
			value: suggestion,
			label: suggestion
		}));

	protected applyEditionSuggestion(value: string | undefined) {
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
				coverUrl: e.game.coverUrl,
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

	protected selectGame(game: Game) {
		this.selectedGame.set(game);
		const platforms = game.platforms ?? [];
		this.model.update(m => ({
			...m,
			gameId: game.id,
			platformId: platforms.length === 1 ? platforms[0].id : ""
		}));
	}

	protected setPlatform(platformId: string) {
		this.model.update(m => ({ ...m, platformId }));
	}

	protected clearGame() {
		this.selectedGame.set(null);
		this.model.update(m => ({ ...m, gameId: "", platformId: "" }));
		this.returnedToSearch.set(true);
	}

	protected onSubmit(event: Event) {
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

	protected onDelete() {
		this.isLoading.set(true);
		this.shelfService.delete(this.entry!.id).subscribe({
			next: () => this.dialogRef.close("saved"),
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Delete failed");
			}
		});
	}

	protected onClose() {
		this.dialogRef.close();
	}
}
