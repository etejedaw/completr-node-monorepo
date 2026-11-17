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
	UiButton,
	UiEyebrow,
	UiOptionPicker,
	type UiPickerOption,
	UiSkeleton
} from "../../../../shared/ui";
import { injectRewindLinkShare } from "../../inject-rewind-link-share";
import { rewindCopy, rewindSummarySentence } from "../../rewind-copy";
import { type RewindDesignComponent } from "../../rewind-designs.model";
import { RewindReveal } from "../../rewind-reveal";
import { REWIND_SHARE_COPY } from "../../rewind-share-copy";
import { REWIND_YEAR_FILL_CLASS } from "../../rewind-tone";
import { RewindMoreYears } from "../rewind-more-years/rewind-more-years";
import { RewindOwnerPanel } from "../rewind-owner-panel/rewind-owner-panel";
import {
	hasRewind2025Awards,
	Rewind2025Awards
} from "./rewind-2025-awards/rewind-2025-awards";
import { Rewind2025CoverFeature } from "./rewind-2025-cover-feature/rewind-2025-cover-feature";
import { Rewind2025LeftBehind } from "./rewind-2025-left-behind/rewind-2025-left-behind";
import { Rewind2025PersonaRank } from "./rewind-2025-persona-rank/rewind-2025-persona-rank";
import {
	hasRewind2025PremiumCharts,
	Rewind2025PremiumStats
} from "./rewind-2025-premium-stats/rewind-2025-premium-stats";
import { Rewind2025RecapArticle } from "./rewind-2025-recap-article/rewind-2025-recap-article";
import { Rewind2025Shelves } from "./rewind-2025-shelves/rewind-2025-shelves";
import {
	Rewind2025Tally,
	rewind2025TallyRows
} from "./rewind-2025-tally/rewind-2025-tally";
import {
	hasRewind2025YearMixCharts,
	Rewind2025YearMix
} from "./rewind-2025-year-mix/rewind-2025-year-mix";
import { rewindDesign2025Copy } from "./rewind-design-2025.copy";

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
		Rewind2025LeftBehind,
		Rewind2025PersonaRank,
		Rewind2025PremiumStats,
		Rewind2025RecapArticle,
		Rewind2025Shelves,
		Rewind2025Tally,
		Rewind2025YearMix,
		RewindMoreYears,
		RewindOwnerPanel,
		RewindReveal,
		UiButton,
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

	protected readonly designCopy = computed(() =>
		rewindDesign2025Copy(this.rewind().language)
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner()
			? this.text().ownerEyebrow
			: this.text().visitorEyebrow(this.username())
	);

	protected readonly summary = computed(() => {
		const { totals, language } = this.rewind();
		return rewindSummarySentence(totals, language);
	});

	protected readonly tally = computed(() => {
		const { totals, language } = this.rewind();
		return rewind2025TallyRows(totals, language);
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
		return !!stats && hasRewind2025PremiumCharts(stats);
	});

	protected readonly hasYearMix = computed(() =>
		hasRewind2025YearMixCharts(this.rewind().yearMix)
	);

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

	protected readonly shareCopy = REWIND_SHARE_COPY;
	private readonly shareRewindLink = injectRewindLinkShare();

	protected shareLink() {
		const year = this.rewind().year;
		void this.shareRewindLink({
			username: this.username(),
			year,
			title: this.isOwner()
				? this.shareCopy.ownerPreviewAlt(year)
				: this.shareCopy.visitorPreviewAlt(this.username(), year)
		});
	}

	protected readonly skeletonShelves = [0, 1];
	protected readonly skeletonPosters = [0, 1, 2, 3, 4, 5];
}
