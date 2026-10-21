import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiInput
} from "../../../../shared/ui";
import { ListsService } from "../../../lists/lists";
import { GamesService } from "../../games";

interface MyList {
	id: string;
	name: string;
	isPublic: boolean;
	contains: boolean;
}

interface FeaturedList {
	id: string;
	name: string;
	description?: string;
	isOfficial: boolean;
	completed: boolean;
	owner: { username: string } | null;
}

export interface ListsChanged {
	lists: FeaturedList[];
	myLists: MyList[];
}

export interface GameAddToListModalData {
	gameId: string;
	gameTitle: string;
	myLists: MyList[];
	onListsChanged: (data: ListsChanged) => void;
}

interface ModalState {
	selection: Map<string, boolean>;
	newListName: string;
	creatingNew: boolean;
	saving: boolean;
	error: string;
}

@Component({
	selector: "app-game-add-to-list-modal",
	imports: [UiAlert, UiButton, UiDialog, UiFieldLabel, UiInput],
	templateUrl: "./game-add-to-list-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameAddToListModal implements OnInit {
	private readonly gamesService = inject(GamesService);
	private readonly listsService = inject(ListsService);
	private readonly dialogRef = injectDialogRef<GameAddToListModalData>();

	protected readonly gameId = this.dialogRef.data.gameId;
	protected readonly gameTitle = this.dialogRef.data.gameTitle;
	protected readonly myLists = this.dialogRef.data.myLists;

	protected readonly state = signal<ModalState>({
		selection: new Map(),
		newListName: "",
		creatingNew: false,
		saving: false,
		error: ""
	});

	ngOnInit() {
		const selection = new Map<string, boolean>();
		for (const list of this.myLists) {
			selection.set(list.id, list.contains);
		}
		this.update({ selection });
	}

	protected update(patch: Partial<ModalState>) {
		this.state.update(s => ({ ...s, ...patch }));
	}

	protected isChecked(listId: string): boolean {
		return this.state().selection.get(listId) ?? false;
	}

	protected toggleSelection(listId: string) {
		const next = new Map(this.state().selection);
		next.set(listId, !next.get(listId));
		this.update({ selection: next });
	}

	protected close() {
		this.dialogRef.close();
	}

	protected createNewList() {
		const name = this.state().newListName.trim();
		if (!name || this.state().creatingNew) return;

		this.update({ creatingNew: true, error: "" });
		this.listsService
			.create({
				name,
				isPublic: true,
				scoreSource: "metacritic",
				durationSource: "hltb"
			})
			.subscribe({
				next: list => {
					this.listsService.addItem(list.id, this.gameId).subscribe({
						next: () => this.refreshAfterCreate(),
						error: () =>
							this.update({
								error: "List created but failed to add game",
								creatingNew: false
							})
					});
				},
				error: () =>
					this.update({
						error: "Failed to create list",
						creatingNew: false
					})
			});
	}

	private refreshAfterCreate() {
		this.gamesService.getGameLists(this.gameId).subscribe(data => {
			const selection = new Map(this.state().selection);
			for (const l of data.myLists) {
				if (!selection.has(l.id)) selection.set(l.id, l.contains);
			}
			this.update({ selection, newListName: "", creatingNew: false });
			this.dialogRef.data.onListsChanged(data);
		});
	}

	protected save() {
		const selection = this.state().selection;
		const hasChanges = this.myLists.some(
			list => (selection.get(list.id) ?? false) !== list.contains
		);

		if (!hasChanges) {
			this.close();
			return;
		}

		const listIds = [...selection]
			.filter(([, checked]) => checked)
			.map(([listId]) => listId);

		this.update({ saving: true });
		this.listsService.setGameLists(this.gameId, listIds).subscribe({
			next: data => {
				this.update({ saving: false });
				this.dialogRef.data.onListsChanged(data);
				this.close();
			},
			error: () => this.update({ saving: false })
		});
	}
}
