import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type RewindLanguage } from "../../../../../core/models/rewind.model";
import { UiButton } from "../../../../../shared/ui";
import { injectRewindLinkShare } from "../../../inject-rewind-link-share";
import { rewindCopy } from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { REWIND_SHARE_COPY } from "../../../rewind-share-copy";

@Component({
	selector: "app-rewind-2026-visitor-share-row",
	imports: [RewindReveal, UiButton],
	templateUrl: "./rewind-2026-visitor-share-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026VisitorShareRow {
	readonly username = input.required<string>();
	readonly year = input.required<number>();
	readonly language = input.required<RewindLanguage>();
	readonly title = input.required<string>();

	private readonly shareRewindLink = injectRewindLinkShare();

	protected readonly shareCopy = REWIND_SHARE_COPY;
	protected readonly headline = computed(() =>
		rewindCopy(this.language()).page.visitorShareHeadline(
			this.username(),
			this.year()
		)
	);

	protected shareLink() {
		return this.shareRewindLink({
			username: this.username(),
			year: this.year(),
			title: this.title()
		});
	}
}
