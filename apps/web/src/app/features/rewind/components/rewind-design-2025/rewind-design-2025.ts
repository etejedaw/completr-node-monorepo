import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import {
	type Rewind,
	type RewindFinishedGame
} from "../../../../core/models/rewind.model";
import { ProfileBackdrop } from "../../../../shared/components/profile-backdrop/profile-backdrop";
import { ProfileSectionHeader } from "../../../../shared/components/profile-section-header/profile-section-header";
import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import {
	UiEyebrow,
	UiOptionPicker,
	type UiPickerOption,
	UiSkeleton
} from "../../../../shared/ui";
import { rewindCopy } from "../../rewind-copy";
import { type RewindDesignComponent } from "../../rewind-designs.model";
import { RewindReveal } from "../../rewind-reveal";
import { REWIND_YEAR_FILL_CLASS } from "../../rewind-tone";
import { RewindMoreYears } from "../rewind-more-years/rewind-more-years";
import { RewindOwnerPanel } from "../rewind-owner-panel/rewind-owner-panel";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";
import {
	hasPremiumCharts,
	RewindPremiumStats
} from "../rewind-premium-stats/rewind-premium-stats";
import { RewindTally, rewindTallyRows } from "../rewind-tally/rewind-tally";
import {
	hasRewind2025Awards,
	Rewind2025Awards
} from "./rewind-2025-awards/rewind-2025-awards";
import { Rewind2025CoverFeature } from "./rewind-2025-cover-feature/rewind-2025-cover-feature";
import { Rewind2025RecapArticle } from "./rewind-2025-recap-article/rewind-2025-recap-article";
import { Rewind2025Shelves } from "./rewind-2025-shelves/rewind-2025-shelves";

export const COLLAGE_TILES = 18;

function artOf(game: RewindFinishedGame): string | null {
	return game.coverUrl ?? game.backgroundUrl;
}

export function collageCovers(games: RewindFinishedGame[]): string[] {
	const covers = games.map(artOf).filter((url): url is string => !!url);
	if (covers.length === 0) return [];
	return Array.from(
		{ length: COLLAGE_TILES },
		(_, index) => covers[index % covers.length]
	);
}

function backdropOf(rewind: Rewind): string | null {
	return (
		rewind.highlights.topRated?.backgroundUrl ??
		rewind.finishedGames.find(game => game.backgroundUrl)?.backgroundUrl ??
		null
	);
}

@Component({
	selector: "app-rewind-design-2025",
	imports: [
		CoverUrlPipe,
		ProfileBackdrop,
		ProfileSectionHeader,
		Rewind2025Awards,
		Rewind2025CoverFeature,
		Rewind2025RecapArticle,
		Rewind2025Shelves,
		RewindMoreYears,
		RewindOwnerPanel,
		RewindPersonaRank,
		RewindPremiumStats,
		RewindReveal,
		RewindTally,
		UiEyebrow,
		UiOptionPicker,
		UiSkeleton
	],
	templateUrl: "./rewind-design-2025.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindDesign2025 implements RewindDesignComponent {
	readonly rewind = input.required<Rewind>();
	readonly username = input.required<string>();
	readonly isOwner = input(false);
	readonly rewindChange = output<Rewind>();

	protected readonly yearFillClass = REWIND_YEAR_FILL_CLASS;

	protected readonly text = computed(
		() => rewindCopy(this.rewind().language).page
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner()
			? this.text().ownerEyebrow
			: this.text().visitorEyebrow(this.username())
	);

	protected readonly tally = computed(() => {
		const { totals, language } = this.rewind();
		return rewindTallyRows(
			{ ...totals, started: 0, platinums: null, finishRate: null },
			language
		);
	});

	protected readonly collage = computed(() =>
		collageCovers(this.rewind().finishedGames)
	);

	protected readonly backdropUrl = computed(() => backdropOf(this.rewind()));

	protected readonly hasHighlights = computed(() =>
		hasRewind2025Awards(this.rewind().highlights)
	);

	protected readonly hasPremiumStats = computed(() => {
		const stats = this.rewind().premiumStats;
		return !!stats && hasPremiumCharts(stats);
	});

	protected readonly yearOptions = computed<UiPickerOption[]>(() => {
		const rewind = this.rewind();
		return [rewind.year, ...rewind.otherYears]
			.sort((a, b) => b - a)
			.map(year => ({
				value: String(year),
				label: String(year),
				icon: "history",
				link: `/user/${this.username()}/rewind/${year}`
			}));
	});

	protected readonly skeletonShelves = [0, 1];
	protected readonly skeletonPosters = [0, 1, 2, 3, 4, 5];
}
