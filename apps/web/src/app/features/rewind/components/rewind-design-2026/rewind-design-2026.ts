import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";

import { type Rewind } from "../../../../core/models/rewind.model";
import { OptionPicker } from "../../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../../shared/components/option-picker/option-picker.model";
import { ProfileBackdrop } from "../../../../shared/components/profile-backdrop/profile-backdrop";
import {
	UiButton,
	UiDialog,
	UiEyebrow,
	UiSkeleton
} from "../../../../shared/ui";
import { ProfileSectionHeader } from "../../../public-profile/components/profile-section-header";
import { rewindCopy, rewindSummarySentence } from "../../rewind-copy";
import { type RewindDesignComponent } from "../../rewind-designs.model";
import { RewindReveal } from "../../rewind-reveal";
import { REWIND_SHARE_COPY } from "../../rewind-share-copy";
import { injectRewindStoryImage } from "../../rewind-story-image";
import { RewindAiRecap } from "../rewind-ai-recap/rewind-ai-recap";
import { RewindFinishedGames } from "../rewind-finished-games/rewind-finished-games";
import {
	presentHighlightKeys,
	RewindHighlights
} from "../rewind-highlights/rewind-highlights";
import { RewindMoreYears } from "../rewind-more-years/rewind-more-years";
import { RewindOwnerPanel } from "../rewind-owner-panel/rewind-owner-panel";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";
import {
	hasPremiumCharts,
	RewindPremiumStats
} from "../rewind-premium-stats/rewind-premium-stats";
import { RewindShareActions } from "../rewind-share-actions/rewind-share-actions";
import { RewindTally, rewindTallyRows } from "../rewind-tally/rewind-tally";
import {
	hasYearMixCharts,
	RewindYearMix
} from "../rewind-year-mix/rewind-year-mix";
import { RewindYearOdometer } from "../rewind-year-odometer/rewind-year-odometer";

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
		OptionPicker,
		ProfileBackdrop,
		ProfileSectionHeader,
		RewindAiRecap,
		RewindFinishedGames,
		RewindHighlights,
		RewindMoreYears,
		RewindOwnerPanel,
		RewindPersonaRank,
		RewindPremiumStats,
		RewindReveal,
		RewindShareActions,
		RewindTally,
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

	protected readonly hasHighlights = computed(
		() => presentHighlightKeys(this.rewind().highlights).length > 0
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner()
			? this.text().ownerEyebrow
			: this.text().visitorEyebrow(this.username())
	);

	protected readonly summary = computed(() => {
		const rewind = this.rewind();
		return rewindSummarySentence(rewind.totals, rewind.language);
	});

	protected readonly tally = computed(() => {
		const rewind = this.rewind();
		return rewindTallyRows(rewind.totals, rewind.language);
	});

	protected readonly backdropUrl = computed(() => backdropOf(this.rewind()));

	protected readonly yearOptions = computed<PickerOption[]>(() => {
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

	protected readonly sectionAreas = computed(() => {
		const rewind = this.rewind();
		const rows = [
			"results share",
			rewind.aiRecap ? "recap recap" : null,
			this.hasHighlights() ? "highlights highlights" : null,
			this.hasYearMix() ? "mix mix" : null,
			this.hasPremiumStats() ? "stats stats" : null,
			rewind.finishedGames.length ? "finished finished" : null,
			rewind.otherYears.length ? "more more" : null
		];
		return rows
			.filter(row => row !== null)
			.map(row => `"${row}"`)
			.join(" ");
	});

	protected readonly shareCopy = REWIND_SHARE_COPY;
	protected readonly shareOpen = signal(false);
	protected readonly skeletonMonths = [0, 1];
	protected readonly skeletonPosters = [0, 1, 2, 3, 4, 5];
}
