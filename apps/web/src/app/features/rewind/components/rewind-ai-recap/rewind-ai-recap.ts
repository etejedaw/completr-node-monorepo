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
	type RewindLanguage
} from "../../../../core/models/rewind.model";
import { UiPremiumBadge } from "../../../../shared/ui";
import { rewindCopy } from "../../rewind-copy";
import { RewindReveal } from "../../rewind-reveal";
import {
	REWIND_PREMIUM_FRAME_CLASS,
	TONE_TINT_SECONDARY_CLASS,
	toneVar
} from "../../rewind-tone";
import { type InsightStyle, type InsightView } from "./rewind-ai-recap.model";

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
	template: `
		@let text = copy();
		<section
			aria-labelledby="rewind-ai-recap-heading"
			class="gap-6 p-5 sm:gap-8 sm:p-8"
			[class]="frameClass"
		>
			<span
				aria-hidden="true"
				class="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-premium)_22%,transparent),transparent_70%)]"
			></span>
			<header class="flex items-center gap-2.5">
				<span
					aria-hidden="true"
					class="material-icons text-2xl text-premium"
					>auto_awesome</span
				>
				<h2
					id="rewind-ai-recap-heading"
					class="m-0 min-w-0 font-display text-xl sm:text-2xl font-bold tracking-tight"
				>
					{{ text.heading }}
				</h2>
				<ui-premium-badge
					class="ml-auto"
					interactive
					[label]="text.premiumLabel"
					[message]="premiumPerk"
				/>
			</header>

			<div class="flex min-w-0 flex-col gap-4">
				<p
					class="m-0 font-display text-2xl sm:text-4xl font-bold leading-[1.1] tracking-tight text-fg text-balance [overflow-wrap:anywhere]"
				>
					{{ recap().headline }}
				</p>
				@for (paragraph of paragraphs(); track $index) {
					<p
						class="m-0 max-w-[65ch] text-base leading-relaxed text-fg-secondary text-pretty [overflow-wrap:anywhere]"
					>
						{{ paragraph }}
					</p>
				}
			</div>

			@if (insights().length > 0) {
				<ul
					class="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-3"
					[attr.aria-label]="text.insights"
				>
					@for (insight of insights(); track insight.key) {
						<li
							appRewindReveal
							class="flex min-w-0 flex-col gap-2 rounded-card border-t-4 border-t-(--tone) bg-[color-mix(in_oklab,var(--tone)_12%,var(--color-surface))] p-4"
							[revealDelay]="insight.delayMs"
							[style.--tone]="insight.tone"
						>
							<span
								class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
								[class]="tintSecondaryClass"
							>
								<span
									aria-hidden="true"
									class="material-icons text-base text-(--tone)"
									>{{ insight.icon }}</span
								>
								{{ insight.label }}
							</span>
							<h3
								class="m-0 font-display text-lg font-bold leading-tight text-fg [overflow-wrap:anywhere]"
							>
								{{ insight.title }}
							</h3>
							<p
								class="m-0 text-sm leading-relaxed text-fg-secondary [overflow-wrap:anywhere]"
							>
								{{ insight.body }}
							</p>
						</li>
					}
				</ul>
			}

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				@if (recap().funFact) {
					<div
						appRewindReveal
						class="flex min-w-0 items-start gap-3 rounded-card border border-line p-4"
					>
						<span
							aria-hidden="true"
							class="material-icons text-xl text-premium"
							>lightbulb</span
						>
						<div class="flex min-w-0 flex-col gap-1">
							<h3
								class="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-fg-secondary"
							>
								{{ text.funFact }}
							</h3>
							<p
								class="m-0 text-sm leading-relaxed text-fg [overflow-wrap:anywhere]"
							>
								{{ recap().funFact }}
							</p>
						</div>
					</div>
				}
				@if (recap().nextYearChallenge) {
					<div
						appRewindReveal
						[revealDelay]="80"
						class="flex min-w-0 items-start gap-3 rounded-card border border-premium/45 bg-premium/10 p-4"
					>
						<span
							aria-hidden="true"
							class="material-icons text-xl text-premium"
							>flag</span
						>
						<div class="flex min-w-0 flex-col gap-1">
							<h3
								class="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-premium"
							>
								{{ text.nextYearChallenge(year() + 1) }}
							</h3>
							<p
								class="m-0 font-display text-base sm:text-lg font-semibold leading-snug text-fg [overflow-wrap:anywhere]"
							>
								{{ recap().nextYearChallenge }}
							</p>
						</div>
					</div>
				}
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindAiRecap {
	protected readonly premiumPerk = AI_RECAP_PREMIUM_PERK;
	readonly recap = input.required<RewindAiRecapData>();
	readonly year = input.required<number>();
	readonly language = input<RewindLanguage>("en");

	protected readonly frameClass = REWIND_PREMIUM_FRAME_CLASS;
	protected readonly tintSecondaryClass = TONE_TINT_SECONDARY_CLASS;

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
