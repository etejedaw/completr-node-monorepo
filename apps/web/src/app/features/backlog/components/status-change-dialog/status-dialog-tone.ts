import { type BacklogStatus } from "../../../../core/models";
import { type UiDialogTone } from "../../../../shared/ui";

const STATUS_DIALOG_TONES: Partial<Record<BacklogStatus, UiDialogTone>> = {
	completed: "success",
	abandoned: "danger"
};

export function statusDialogTone(status: BacklogStatus): UiDialogTone {
	return STATUS_DIALOG_TONES[status] ?? "brand";
}
