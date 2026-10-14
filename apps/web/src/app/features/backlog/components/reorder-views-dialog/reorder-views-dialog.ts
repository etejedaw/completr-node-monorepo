import {
	CdkDrag,
	type CdkDragDrop,
	CdkDragHandle,
	CdkDropList,
	moveItemInArray
} from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";

import { UiButton, UiDialog, UiIconButton } from "../../../../shared/ui";
import { type SavedFilter } from "../../saved-filters";

@Component({
	selector: "app-reorder-views-dialog",
	imports: [
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
		UiButton,
		UiDialog,
		UiIconButton
	],
	templateUrl: "./reorder-views-dialog.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReorderViewsDialog implements OnInit {
	readonly views = input.required<SavedFilter[]>();
	readonly saving = input(false);

	readonly saveRequested = output<string[]>();
	readonly cancelled = output<void>();

	protected readonly items = signal<SavedFilter[]>([]);

	ngOnInit() {
		this.items.set([...this.views()]);
	}

	protected moveReorderUp(index: number) {
		if (index === 0) return;
		const items = [...this.items()];
		[items[index - 1], items[index]] = [items[index], items[index - 1]];
		this.items.set(items);
	}

	protected moveReorderDown(index: number) {
		const items = [...this.items()];
		if (index >= items.length - 1) return;
		[items[index], items[index + 1]] = [items[index + 1], items[index]];
		this.items.set(items);
	}

	protected onReorderDrop(event: CdkDragDrop<SavedFilter[]>) {
		if (event.previousIndex === event.currentIndex) return;
		const items = [...this.items()];
		moveItemInArray(items, event.previousIndex, event.currentIndex);
		this.items.set(items);
	}

	protected save() {
		this.saveRequested.emit(this.items().map(view => view.id));
	}
}
