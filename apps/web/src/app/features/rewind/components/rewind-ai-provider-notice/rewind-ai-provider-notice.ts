import {
	ChangeDetectionStrategy,
	Component,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiEyebrow, UiIconButton } from "../../../../shared/ui";

@Component({
	selector: "app-rewind-ai-provider-notice",
	imports: [RouterLink, UiEyebrow, UiIconButton],
	templateUrl: "./rewind-ai-provider-notice.html",
	host: { class: "flex flex-col gap-2" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindAiProviderNotice {
	readonly headingId = input.required<string>();
	readonly heading = input("AI recap");
	readonly showProvider = input(true);

	protected readonly open = signal(false);

	protected toggle() {
		this.open.set(!this.open());
	}
}
