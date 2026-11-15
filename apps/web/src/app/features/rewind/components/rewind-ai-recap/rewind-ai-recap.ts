import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindAiRecap as RewindAiRecapData,
	type RewindInsight,
	type RewindInsightKind,
	type RewindLanguage,
	type RewindPremiumAccessKind
} from "../../../../core/models/rewind.model";
import { UiPremiumBadge } from "../../../../shared/ui";
import { rewindCopy } from "../../rewind-copy";
import { RewindReveal } from "../../rewind-reveal";
import {
	REWIND_PREMIUM_FRAME_CLASS,
	type RewindTone,
	TONE_TINT_SECONDARY_CLASS,
	toneVar
} from "../../rewind-tone";
import { type InsightStyle, type InsightView } from "./rewind-ai-recap.model";

const FUN_FACT_TONE: RewindTone = "playing";
const CHALLENGE_TONE: RewindTone = "tags";

const AI_RECAP_PREMIUM_PERK =
	"The AI recap reads the whole year to describe the player behind it.";

export const INSIGHT_STYLE: Record<RewindInsightKind, InsightStyle> = {
	"taste-vs-critics": { icon: "reviews", tone: "brand" },
	"genre-pattern": { icon: "category", tone: "queue" },
	"seasonal-rhythm": { icon: "calendar_month", tone: "shelf" },
	"finish-discipline": { icon: "sports_score", tone: "success" },
	"long-vs-short": { icon: "hourglass_top", tone: "sagas" },
	"platform-habit": { icon: "sports_esports", tone: "platinum" },
	"backlog-comeback": { icon: "restore", tone: "lists" }
};

const FALLBACK_INSIGHT_STYLE: InsightStyle = {
	icon: "insights",
	tone: "brand"
};
const INSIGHT_REVEAL_STAGGER_MS = 80;

export function summaryParagraphs(summary: string): string[] {
	return summary
		.split(/\n\s*\n/)
		.map(paragraph => paragraph.trim())
		.filter(paragraph => paragraph.length > 0);
}

function isInsightKind(kind: unknown): kind is RewindInsightKind {
	return typeof kind === "string" && Object.hasOwn(INSIGHT_STYLE, kind);
}

@Component({
	selector: "app-rewind-ai-recap",
	imports: [RewindReveal, UiPremiumBadge],
	templateUrl: "./rewind-ai-recap.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindAiRecap {
	protected readonly premiumPerk = AI_RECAP_PREMIUM_PERK;
	readonly recap = input.required<RewindAiRecapData>();
	readonly year = input.required<number>();
	readonly language = input<RewindLanguage>("en");
	readonly premiumAccessKind = input<RewindPremiumAccessKind | null>(null);

	protected readonly premiumLabel = computed(() => {
		const kind = this.premiumAccessKind();
		return kind
			? rewindCopy(this.language()).aiRecap.premiumLabels[kind]
			: null;
	});
	protected readonly frameClass = REWIND_PREMIUM_FRAME_CLASS;
	protected readonly tintSecondaryClass = TONE_TINT_SECONDARY_CLASS;
	protected readonly funFactTone = toneVar(FUN_FACT_TONE);
	protected readonly challengeTone = toneVar(CHALLENGE_TONE);

	protected readonly copy = computed(
		() => rewindCopy(this.language()).aiRecap
	);

	protected readonly paragraphs = computed(() =>
		summaryParagraphs(this.recap().summary)
	);

	protected readonly insights = computed(() =>
		this.recap().insights.map((insight, index) =>
			this.insightView(insight, index)
		)
	);

	private insightView(insight: RewindInsight, index: number): InsightView {
		const known = isInsightKind(insight.kind);
		const style = known
			? INSIGHT_STYLE[insight.kind]
			: FALLBACK_INSIGHT_STYLE;
		return {
			key: `${index}-${insight.kind}`,
			label: known ? this.copy().insightKinds[insight.kind] : "",
			icon: style.icon,
			tone: toneVar(style.tone),
			title: insight.title,
			body: insight.body,
			delayMs: index * INSIGHT_REVEAL_STAGGER_MS
		};
	}
}
