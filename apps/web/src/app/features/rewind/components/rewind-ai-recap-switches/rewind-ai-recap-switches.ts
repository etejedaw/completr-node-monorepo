import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { UiAlert, UiSwitch } from "../../../../shared/ui";

@Component({
	selector: "app-rewind-ai-recap-switches",
	imports: [UiAlert, UiSwitch],
	templateUrl: "./rewind-ai-recap-switches.html",
	host: { class: "flex flex-col gap-4" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindAiRecapSwitches {
	readonly includePrivateRuns = model(false);
	readonly includeNotes = model(false);
	readonly writesAiRecap = input(true);
	readonly disabled = input(false);

	protected readonly privateRunsWarning = computed(() =>
		this.writesAiRecap()
			? "Your AI recap and premium stats may mention private games, your Up Next and your platinums, and anyone who can see your Rewind will read them."
			: "Your premium stats may include private games, and anyone who can see your Rewind will see them."
	);
	protected readonly privateRunsHint = computed(() =>
		this.writesAiRecap()
			? "Off by default. Only your AI recap and premium stats use private runs."
			: "Off by default. Only your premium stats use private runs."
	);
}
