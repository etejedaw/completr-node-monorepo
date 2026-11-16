import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output
} from "@angular/core";

import {
	type AddRewindAiRecapRequest,
	type Rewind
} from "../../../../core/models/rewind.model";
import { UiAlert, UiButton, UiDialog } from "../../../../shared/ui";
import { RewindAiProviderNotice } from "../rewind-ai-provider-notice/rewind-ai-provider-notice";
import { RewindAiRecapSwitches } from "../rewind-ai-recap-switches/rewind-ai-recap-switches";

@Component({
	selector: "app-rewind-ai-recap-dialog",
	imports: [
		RewindAiProviderNotice,
		RewindAiRecapSwitches,
		UiAlert,
		UiButton,
		UiDialog
	],
	templateUrl: "./rewind-ai-recap-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindAiRecapDialog {
	readonly rewind = input.required<Rewind>();
	readonly submitted = output<AddRewindAiRecapRequest>();
	readonly closed = output<void>();

	protected readonly includePrivateRuns = linkedSignal(
		() => this.rewind().ownerControls?.includesPrivateRuns ?? false
	);
	protected readonly includeNotes = linkedSignal(
		() => this.rewind().ownerControls?.includesNotes ?? false
	);
	protected readonly addsPremiumStats = computed(
		() => this.rewind().premiumStats === null
	);
	protected readonly heading = computed(
		() => `Add the AI recap to your ${this.rewind().year} Rewind`
	);

	protected submit() {
		this.submitted.emit({
			includePrivateRuns: this.includePrivateRuns(),
			includeNotes: this.includeNotes()
		});
	}
}
