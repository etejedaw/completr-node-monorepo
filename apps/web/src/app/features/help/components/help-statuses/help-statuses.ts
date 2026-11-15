import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type BacklogStatus } from "../../../../core/models";
import { BacklogStatusBadge } from "../../../../shared/components/backlog-status-badge/backlog-status-badge";
import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../../shared/directives/in-view";
import { UiEyebrow } from "../../../../shared/ui";

const STATUS_GUIDE: readonly { status: BacklogStatus; text: string }[] = [
	{
		status: "not_started",
		text: "You have it lined up but haven't pressed start."
	},
	{ status: "playing", text: "In progress right now." },
	{
		status: "completed",
		text: "Finished. Unlocks your personal ratio and your review."
	},
	{ status: "abandoned", text: "Dropped. You can note why." },
	{
		status: "endless",
		text: "No real ending: multiplayer, roguelikes, live games."
	}
];

@Component({
	selector: "app-help-statuses",
	imports: [BacklogStatusBadge, InView, UiEyebrow],
	templateUrl: "./help-statuses.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpStatuses {
	protected readonly statuses = STATUS_GUIDE;
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
