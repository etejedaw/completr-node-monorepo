import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { getRatingLabel } from "../../../../shared/constants/rating-labels";
import { type CanonicalScore } from "../../../../shared/utils/canonical-score";
import { metascoreColorClass } from "../../../../shared/utils/metascore-color";

interface ScoreRow {
	label: string;
	value: string;
	unit?: string;
	valueClass?: string;
	stars?: number;
}

interface ScoreCardVariant {
	title: string;
	icon: string | null;
	description: string;
	frameClass: string;
	accentClass: string;
	rows: ScoreRow[];
}

function buildVariant(score: CanonicalScore): ScoreCardVariant | null {
	const duration = score.duration ?? 0;
	if (score.type === "completr") {
		return {
			title: "Completr Score",
			icon: null,
			description:
				"Community rating relative to the time it takes to beat.",
			frameClass:
				"border-brand/50 bg-[linear-gradient(160deg,var(--color-brand-subtle),transparent_65%)]",
			accentClass: "text-brand",
			rows: [
				{
					label: "Rating",
					value: getRatingLabel(score.score),
					stars: score.score ?? 0,
					valueClass: "text-warning"
				},
				{ label: "Duration", value: `${duration}`, unit: "h avg" }
			]
		};
	}
	if (score.type === "aggregate") {
		return {
			title: "Aggregate Score",
			icon: "auto_awesome",
			description:
				"Provisional — Metacritic and HowLongToBeat until the community weighs in.",
			frameClass:
				"border-dashed border-info/50 bg-[linear-gradient(160deg,rgba(56,189,248,0.08),transparent_65%)]",
			accentClass: "text-info",
			rows: [
				{
					label: "Metascore",
					value: `${score.score}`,
					unit: "/100",
					valueClass: metascoreColorClass(score.score)
				},
				{ label: "HLTB", value: `${duration}`, unit: "h" }
			]
		};
	}
	if (score.type === "rawg") {
		return {
			title: "RAWG Score",
			icon: "cloud_download",
			description:
				"Fallback — RAWG community data while Metacritic and HLTB are missing.",
			frameClass: "border-dashed border-line-hover",
			accentClass: "text-fg-secondary",
			rows: [
				{ label: "Rating", value: `${score.score}`, unit: "/5" },
				{ label: "Playtime", value: `${duration}`, unit: "h" }
			]
		};
	}
	return null;
}

@Component({
	selector: "app-game-score-card",
	imports: [StarRating],
	templateUrl: "./game-score-card.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameScoreCard {
	readonly score = input.required<CanonicalScore>();
	readonly reportSent = input(false);
	readonly reporting = input(false);

	readonly missingDataReported = output<void>();

	protected readonly variant = computed(() => buildVariant(this.score()));
}
