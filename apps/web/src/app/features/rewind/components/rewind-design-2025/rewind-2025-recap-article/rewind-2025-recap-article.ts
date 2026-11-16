import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindAiRecap,
	type RewindLanguage,
	type RewindPremiumAccessKind
} from "../../../../../core/models/rewind.model";
import { UiEyebrow, UiPremiumBadge } from "../../../../../shared/ui";
import { rewindCopy } from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { REWIND_PREMIUM_FRAME_CLASS } from "../../../rewind-tone";
import { summaryParagraphs } from "../../rewind-ai-recap/rewind-ai-recap";
import { type RecapArticleInsight } from "./rewind-2025-recap-article.model";

const AI_RECAP_PREMIUM_PERK =
	"The AI recap reads the whole year to describe the player behind it.";

function hasText(text: string | null | undefined): text is string {
	return typeof text === "string" && text.trim().length > 0;
}

export function recapPullQuote(recap: RewindAiRecap): string | null {
	const firstInsightTitle = recap.insights.find(insight =>
		hasText(insight.title)
	)?.title;
	if (hasText(firstInsightTitle)) return firstInsightTitle.trim();
	return hasText(recap.funFact) ? recap.funFact.trim() : null;
}

@Component({
	selector: "app-rewind-2025-recap-article",
	imports: [RewindReveal, UiEyebrow, UiPremiumBadge],
	templateUrl: "./rewind-2025-recap-article.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025RecapArticle {
	readonly recap = input.required<RewindAiRecap>();
	readonly year = input.required<number>();
	readonly language = input<RewindLanguage>("en");
	readonly premiumAccessKind = input<RewindPremiumAccessKind | null>(null);

	protected readonly frameClass = REWIND_PREMIUM_FRAME_CLASS;
	protected readonly premiumPerk = AI_RECAP_PREMIUM_PERK;

	protected readonly copy = computed(
		() => rewindCopy(this.language()).aiRecap
	);

	protected readonly premiumLabel = computed(() => {
		const kind = this.premiumAccessKind();
		return kind ? this.copy().premiumLabels[kind] : null;
	});

	private readonly paragraphs = computed(() =>
		summaryParagraphs(this.recap().summary)
	);

	protected readonly leadParagraph = computed(
		() => this.paragraphs()[0] ?? null
	);

	protected readonly restParagraphs = computed(() =>
		this.paragraphs().slice(1)
	);

	protected readonly pullQuote = computed(() => recapPullQuote(this.recap()));

	protected readonly insights = computed<RecapArticleInsight[]>(() => {
		const kinds = this.copy().insightKinds;
		return this.recap()
			.insights.filter(insight => hasText(insight.title))
			.map((insight, index) => ({
				key: `${index}-${insight.kind}`,
				label: Object.hasOwn(kinds, insight.kind)
					? kinds[insight.kind]
					: "",
				title: insight.title,
				body: insight.body
			}));
	});

	protected readonly funFact = computed(() => {
		const funFact = this.recap().funFact;
		return hasText(funFact) ? funFact : null;
	});

	protected readonly challenge = computed(() => {
		const challenge = this.recap().nextYearChallenge;
		return hasText(challenge) ? challenge : null;
	});
}
