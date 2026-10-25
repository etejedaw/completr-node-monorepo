import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import {
	type BacklogEntry,
	type GamePlatinum,
	type Platform
} from "../../../core/models";
import { DialogDeleteAction } from "../../../shared/components/dialog-delete-action/dialog-delete-action";
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
	UiTextarea
} from "../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { PlatinumService } from "../platinum";

export const PLATINUM_NOTES_MAX_LENGTH = 500;

export interface PlatinumDialogData {
	gameId: string;
	gameTitle: string;
	platforms: Platform[];
	runs: BacklogEntry[];
	platinum: GamePlatinum | null;
}

export type PlatinumDialogResult = { platinum: GamePlatinum } | "removed";

const NO_SELECTION = "";

@Component({
	selector: "app-platinum-dialog",
	imports: [
		DialogDeleteAction,
		OptionPicker,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiInput,
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

	protected readonly data = this.dialogRef.data;
	protected readonly isEdit = !!this.data.platinum;
	protected readonly notesMaxLength = PLATINUM_NOTES_MAX_LENGTH;

	protected readonly backlogId = signal(
		this.data.platinum?.backlogId ?? NO_SELECTION
	);
	protected readonly platformId = signal(
		this.data.platinum?.platformId ?? NO_SELECTION
	);
	protected readonly platinumedAt = signal(
		this.data.platinum?.platinumedAt ?? ""
	);
	protected readonly notes = signal(this.data.platinum?.notes ?? "");
	protected readonly saving = signal(false);
	protected readonly removing = signal(false);
	protected readonly saveError = signal("");

	protected readonly runOptions: readonly PickerOption[] = [
		{ value: NO_SELECTION, label: "No specific run", icon: "remove" },
		...this.data.runs.map((run, index) => ({
			value: run.id,
			label: `Run #${this.data.runs.length - index} · ${backlogStatusLabel(run.status)}`,
			hint: run.platform.abbreviation,
			icon: backlogStatusIcon(run.status),
			iconClass: backlogStatusIconColor(run.status)
		}))
	];

	protected readonly platformOptions = computed<readonly PickerOption[]>(
		() => {
			const platforms = [...this.data.platforms];
			for (const run of this.data.runs) {
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

	protected selectRun(backlogId: string) {
		this.backlogId.set(backlogId);
		const run = this.data.runs.find(r => r.id === backlogId);
		if (run && !this.platformId()) this.platformId.set(run.platform.id);
	}

	protected save() {
		if (this.busy()) return;
		this.saving.set(true);
		this.saveError.set("");
		this.platinumService
			.save(this.data.gameId, {
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
		if (this.busy()) return;
		this.removing.set(true);
		this.saveError.set("");
		this.platinumService.remove(this.data.gameId).subscribe({
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
}
