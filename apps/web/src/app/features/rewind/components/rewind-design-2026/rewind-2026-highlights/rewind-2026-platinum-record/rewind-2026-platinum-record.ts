import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { CoverUrlPipe } from "../../../../../../shared/pipes/cover-url";
import { UiEyebrow } from "../../../../../../shared/ui";
import { type PlatinumRecord } from "../rewind-2026-highlights.model";

@Component({
	selector: "app-rewind-2026-platinum-record",
	imports: [CoverUrlPipe, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2026-platinum-record.html",
	host: { class: "block h-full min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026PlatinumRecord {
	readonly record = input.required<PlatinumRecord>();

	protected readonly soleCover = computed(() => {
		const { covers } = this.record();
		return covers.length === 1 ? covers[0] : null;
	});
}
