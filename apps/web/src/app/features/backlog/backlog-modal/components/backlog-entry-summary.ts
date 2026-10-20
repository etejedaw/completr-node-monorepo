import { DatePipe, formatDate } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	LOCALE_ID,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogEntry } from "../../../../core/models";
import { ExpandableText } from "../../../../shared/components/expandable-text/expandable-text";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { RatioSummary } from "../../../../shared/components/ratio-summary/ratio-summary";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import { UiAvatar } from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";
import { type ProgressNote } from "../../../backlog-progress/backlog-progress";
import { type CoopMember } from "../../../coop-runs/coop-runs";
import { MAX_CRITIC_SCORE } from "../reference-values";

const STATUSES_WITH_PROGRESS = new Set(["playing", "endless", "not_started"]);
const RUN_DATE_FORMAT = "MMM d, y";
const MISSING_VALUE = "—";

interface SummaryFact {
	label: string;
	value: string;
}

@Component({
	selector: "app-backlog-entry-summary",
	imports: [
		CoverUrlPipe,
		DatePipe,
		ExpandableText,
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

	private readonly locale = inject(LOCALE_ID);

	protected readonly statusLabel = backlogStatusLabel;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusIconColor = backlogStatusIconColor;

	protected readonly hasRatio = computed(() => {
		const e = this.entry();
		return e.ratio != null || e.personalRatio != null;
	});

	protected readonly latestProgress = computed(() =>
		STATUSES_WITH_PROGRESS.has(this.entry().status)
			? (this.progressNotes()[0] ?? null)
			: null
	);

	protected readonly hasJournal = computed(() => {
		const e = this.entry();
		return (
			!!this.latestProgress() ||
			!!e.notes ||
			(!!e.hasReview && !!e.reviewContent)
		);
	});

	protected readonly runFacts = computed<SummaryFact[]>(() => {
		const e = this.entry();
		const facts: SummaryFact[] = [
			{ label: "Played", value: this.formatHours(e.realDuration) }
		];
		if (e.startedAt)
			facts.push({
				label: "Started",
				value: this.formatDay(e.startedAt)
			});
		if (e.finishedAt)
			facts.push({
				label: "Finished",
				value: this.formatDay(e.finishedAt)
			});
		facts.push({ label: "Platform", value: e.platform.abbreviation });
		return facts;
	});

	protected readonly referenceFacts = computed<SummaryFact[]>(() => {
		const e = this.entry();
		return [
			{
				label: "Critic score",
				value:
					e.score != null
						? `${e.score} / ${MAX_CRITIC_SCORE}`
						: MISSING_VALUE
			},
			{ label: "Duration", value: this.formatHours(e.duration) }
		];
	});

	protected memberName(member: CoopMember): string {
		return member.name || member.username;
	}

	private formatHours(hours: number | null | undefined): string {
		return hours ? `${hours}h` : MISSING_VALUE;
	}

	private formatDay(day: string): string {
		return formatDate(day, RUN_DATE_FORMAT, this.locale);
	}
}
