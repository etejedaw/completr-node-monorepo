import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";

import { type Rewind } from "../../../../core/models/rewind.model";
import { ProfileBackdrop } from "../../../../shared/components/profile-backdrop/profile-backdrop";
import { ProfileSectionHeader } from "../../../../shared/components/profile-section-header/profile-section-header";
import {
	UiButton,
	UiDialog,
	UiEyebrow,
	UiOptionPicker,
	type UiPickerOption,
	UiSkeleton
} from "../../../../shared/ui";
import { rewindCopy } from "../../rewind-copy";
import { type RewindDesignComponent } from "../../rewind-designs.model";
import { RewindReveal } from "../../rewind-reveal";
import { REWIND_SHARE_COPY } from "../../rewind-share-copy";
import { injectRewindStoryImage } from "../../rewind-story-image";
import { RewindAiRecap } from "../rewind-ai-recap/rewind-ai-recap";
import { RewindMoreYears } from "../rewind-more-years/rewind-more-years";
import { RewindOwnerPanel } from "../rewind-owner-panel/rewind-owner-panel";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";
import {
	hasPremiumCharts,
	RewindPremiumStats
} from "../rewind-premium-stats/rewind-premium-stats";
import { RewindShareActions } from "../rewind-share-actions/rewind-share-actions";
import {
	hasYearMixCharts,
	RewindYearMix
} from "../rewind-year-mix/rewind-year-mix";
import { RewindYearOdometer } from "../rewind-year-odometer/rewind-year-odometer";
import { Rewind2026ClosedGames } from "./rewind-2026-closed-games/rewind-2026-closed-games";
import { Rewind2026CoverFan } from "./rewind-2026-cover-fan/rewind-2026-cover-fan";
import { Rewind2026GameOfTheYear } from "./rewind-2026-game-of-the-year/rewind-2026-game-of-the-year";
import {
	hasRewind2026Highlights,
	Rewind2026Highlights
} from "./rewind-2026-highlights/rewind-2026-highlights";
import { Rewind2026ResultsStrip } from "./rewind-2026-results-strip/rewind-2026-results-strip";
import { Rewind2026ShareBanner } from "./rewind-2026-share-banner/rewind-2026-share-banner";

function backdropOf(rewind: Rewind): string | null {
	return (
		rewind.highlights.topRated?.backgroundUrl ??
		rewind.finishedGames.find(game => game.backgroundUrl)?.backgroundUrl ??
		null
	);
}

@Component({
	selector: "app-rewind-design-2026",
	imports: [
		UiOptionPicker,
		ProfileBackdrop,
		ProfileSectionHeader,
		Rewind2026ClosedGames,
		Rewind2026CoverFan,
		Rewind2026GameOfTheYear,
		Rewind2026Highlights,
		Rewind2026ResultsStrip,
		Rewind2026ShareBanner,
		RewindAiRecap,
		RewindMoreYears,
		RewindOwnerPanel,
		RewindPersonaRank,
		RewindPremiumStats,
		RewindReveal,
		RewindShareActions,
		RewindYearMix,
		RewindYearOdometer,
		UiButton,
		UiDialog,
		UiEyebrow,
		UiSkeleton
	],
	templateUrl: "./rewind-design-2026.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindDesign2026 implements RewindDesignComponent {
	readonly rewind = input.required<Rewind>();
	readonly username = input.required<string>();
	readonly isOwner = input(false);
	readonly rewindChange = output<Rewind>();

	protected readonly text = computed(
		() => rewindCopy(this.rewind().language).page
	);

	protected readonly hasPremiumStats = computed(() => {
		const stats = this.rewind().premiumStats;
		return !!stats && hasPremiumCharts(stats);
	});

	protected readonly hasYearMix = computed(() =>
		hasYearMixCharts(this.rewind().yearMix)
	);

	protected readonly hasHighlights = computed(() =>
		hasRewind2026Highlights(this.rewind().highlights)
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner()
			? this.text().ownerEyebrow
			: this.text().visitorEyebrow(this.username())
	);

	protected readonly backdropUrl = computed(() => backdropOf(this.rewind()));

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

	private readonly shareTarget = computed(() => {
		const rewind = this.rewind();
		return {
			username: this.username(),
			year: rewind.year,
			design: rewind.design
		};
	});

	protected readonly hasFinishedGames = computed(
		() => this.rewind().finishedGames.length > 0
	);

	protected readonly hasClosedGames = computed(() => {
		const rewind = this.rewind();
		return (
			rewind.finishedGames.length > 0 || rewind.abandonedGames.length > 0
		);
	});

	protected readonly closedGamesHeading = computed(() => {
		const { year, abandonedGames } = this.rewind();
		return abandonedGames.length > 0
			? this.text().closedIn(year)
			: this.text().finishedIn(year);
	});

	protected readonly storyImage = injectRewindStoryImage(() =>
		this.shareTarget()
	);

	protected readonly gamesImage = injectRewindStoryImage(
		() => (this.hasFinishedGames() ? this.shareTarget() : null),
		"story-list"
	);

	protected readonly previewAlt = computed(() => {
		const year = this.rewind().year;
		return this.isOwner()
			? this.shareCopy.ownerPreviewAlt(year)
			: this.shareCopy.visitorPreviewAlt(this.username(), year);
	});

	protected readonly shareCopy = REWIND_SHARE_COPY;
	protected readonly shareOpen = signal(false);
	protected readonly skeletonMonths = [0, 1, 2];
}
