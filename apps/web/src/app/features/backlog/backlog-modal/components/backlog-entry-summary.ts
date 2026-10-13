import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogEntry } from "../../../../core/models";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { RatioSummary } from "../../../../shared/components/ratio-summary/ratio-summary";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiAvatar } from "../../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { type ProgressNote } from "../../../backlog-progress/backlog-progress";
import { type CoopMember } from "../../../coop-runs/coop-runs";

const STATUSES_WITH_PROGRESS = new Set(["playing", "endless", "not_started"]);

interface SummaryFact {
	label: string;
	value: string;
}

@Component({
	selector: "app-backlog-entry-summary",
	imports: [
		DatePipe,
		GamePoster,
		RatioSummary,
		RouterLink,
		StarRating,
		UiAvatar
	],
	templateUrl: "./backlog-entry-summary.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogEntrySummary {
	readonly entry = input.required<BacklogEntry>();
	readonly moodTags = input<readonly string[]>([]);
	readonly progressNotes = input<readonly ProgressNote[]>([]);
	readonly coopMembers = input<readonly CoopMember[]>([]);
	readonly navigated = output<void>();

	protected readonly statusLabel = backlogStatusLabel;
	protected readonly statusClass = backlogStatusClass;

	protected readonly hasRatio = computed(() => {
		const e = this.entry();
		return e.ratio != null || e.personalRatio != null;
	});

	protected readonly latestProgress = computed(() =>
		STATUSES_WITH_PROGRESS.has(this.entry().status)
			? (this.progressNotes()[0] ?? null)
			: null
	);

	protected readonly facts = computed<SummaryFact[]>(() => {
		const e = this.entry();
		const facts: SummaryFact[] = [
			{ label: "Score", value: e.score != null ? String(e.score) : "—" },
			{ label: "Duration", value: e.duration ? `${e.duration}h` : "—" }
		];
		if (e.realDuration != null)
			facts.push({ label: "Real duration", value: `${e.realDuration}h` });
		if (e.startedAt) facts.push({ label: "Started", value: e.startedAt });
		if (e.finishedAt)
			facts.push({ label: "Finished", value: e.finishedAt });
		return facts;
	});
}
