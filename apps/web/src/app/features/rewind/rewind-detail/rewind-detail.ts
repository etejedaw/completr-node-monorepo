import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	signal
} from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";

import {
	type Rewind,
	type RewindLanguage
} from "../../../core/models/rewind.model";
import { AuthService } from "../../../core/services/auth";
import {
	OptionPicker,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import { ProfileBackdrop } from "../../../shared/components/profile-backdrop/profile-backdrop";
import {
	UiButton,
	UiDialog,
	UiPlainEmptyState,
	UiSkeleton
} from "../../../shared/ui";
import { ProfileAccessState } from "../../public-profile/components/profile-access-state";
import { ProfileSectionHeader } from "../../public-profile/components/profile-section-header";
import { RewindAiRecap } from "../components/rewind-ai-recap/rewind-ai-recap";
import { RewindFinishedGames } from "../components/rewind-finished-games/rewind-finished-games";
import {
	presentHighlightKeys,
	RewindHighlights
} from "../components/rewind-highlights/rewind-highlights";
import { RewindMoreYears } from "../components/rewind-more-years/rewind-more-years";
import { RewindPersonaRank } from "../components/rewind-persona-rank/rewind-persona-rank";
import {
	hasPremiumCharts,
	RewindPremiumStats
} from "../components/rewind-premium-stats/rewind-premium-stats";
import { RewindShareActions } from "../components/rewind-share-actions/rewind-share-actions";
import {
	RewindTally,
	rewindTallyRows
} from "../components/rewind-tally/rewind-tally";
import { RewindYearOdometer } from "../components/rewind-year-odometer/rewind-year-odometer";
import { RewindService } from "../rewind";
import {
	DEFAULT_REWIND_LANGUAGE,
	parseRewindYear,
	rewindCopy,
	rewindSummarySentence
} from "../rewind-copy";
import { type RewindLoadError, rewindLoadError } from "../rewind-errors";
import { RewindReveal } from "../rewind-reveal";
import { injectRewindStoryImage } from "../rewind-story-image";

export type RewindDetailError = RewindLoadError | "not_generated";

const NOT_GENERATED_ERROR_TYPE = "REWIND_NOT_GENERATED";

function detailLoadError(error: unknown): RewindDetailError | null {
	const response = error as HttpErrorResponse | undefined;
	if (
		response?.status === 404 &&
		response.error?.type === NOT_GENERATED_ERROR_TYPE
	) {
		return "not_generated";
	}
	return rewindLoadError(error);
}

function backdropOf(rewind: Rewind): string | null {
	return (
		rewind.highlights.topRated?.backgroundUrl ??
		rewind.finishedGames.find(game => game.backgroundUrl)?.backgroundUrl ??
		null
	);
}

@Component({
	selector: "app-rewind-detail",
	imports: [
		RouterLink,
		OptionPicker,
		ProfileAccessState,
		ProfileBackdrop,
		ProfileSectionHeader,
		RewindFinishedGames,
		RewindHighlights,
		RewindMoreYears,
		RewindAiRecap,
		RewindPersonaRank,
		RewindPremiumStats,
		RewindReveal,
		RewindShareActions,
		RewindTally,
		RewindYearOdometer,
		UiButton,
		UiDialog,
		UiPlainEmptyState,
		UiSkeleton
	],
	templateUrl: "./rewind-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindDetail {
	private readonly route = inject(ActivatedRoute);
	private readonly rewindService = inject(RewindService);
	private readonly authService = inject(AuthService);

	private readonly params = toSignal(this.route.paramMap, {
		initialValue: this.route.snapshot.paramMap
	});

	protected readonly username = computed(
		() => this.params().get("username") ?? ""
	);
	protected readonly year = computed(() =>
		parseRewindYear(this.params().get("year"))
	);

	private readonly request = computed(() => {
		const year = this.year();
		return year === null ? undefined : { username: this.username(), year };
	});

	private readonly resource = rxResource({
		params: () => this.request(),
		stream: ({ params }) =>
			this.rewindService.getRewind(params.username, params.year)
	});

	protected readonly rewind = computed(() => {
		if (!this.resource.hasValue()) return null;
		const rewind = this.resource.value();
		return rewind.year === this.year() ? rewind : null;
	});

	protected readonly loadError = computed<RewindDetailError | null>(() =>
		this.year() === null
			? "not_found"
			: detailLoadError(this.resource.error())
	);

	protected readonly language = linkedSignal<
		{ username: string; rewind: Rewind | null },
		RewindLanguage
	>({
		source: () => ({ username: this.username(), rewind: this.rewind() }),
		computation: (current, previous) => {
			if (current.rewind) return current.rewind.language;
			const sameUser = previous?.source.username === current.username;
			return sameUser ? previous.value : DEFAULT_REWIND_LANGUAGE;
		}
	});

	protected readonly copy = computed(() => rewindCopy(this.language()));
	protected readonly text = computed(() => this.copy().page);

	protected readonly hasPremiumStats = computed(() => {
		const stats = this.rewind()?.premiumStats;
		return !!stats && hasPremiumCharts(stats);
	});

	protected readonly hasHighlights = computed(() => {
		const highlights = this.rewind()?.highlights;
		return !!highlights && presentHighlightKeys(highlights).length > 0;
	});

	protected readonly isOwner = computed(
		() =>
			!!this.authService.user() &&
			this.authService.user()?.username.toLowerCase() ===
				this.username().toLowerCase()
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner()
			? this.text().ownerEyebrow
			: this.text().visitorEyebrow(this.username())
	);

	protected readonly summary = computed(() => {
		const rewind = this.rewind();
		return rewind
			? rewindSummarySentence(rewind.totals, rewind.language)
			: "";
	});

	protected readonly tally = computed(() => {
		const rewind = this.rewind();
		return rewind ? rewindTallyRows(rewind.totals, rewind.language) : [];
	});

	protected readonly backdropUrl = computed(() => {
		const rewind = this.rewind();
		return rewind ? backdropOf(rewind) : null;
	});

	protected readonly yearOptions = computed<PickerOption[]>(() => {
		const rewind = this.rewind();
		if (!rewind) return [];
		return [rewind.year, ...rewind.otherYears]
			.sort((a, b) => b - a)
			.map(year => ({
				value: String(year),
				label: String(year),
				icon: "history",
				link: `/user/${this.username()}/rewind/${year}`
			}));
	});

	protected readonly storyImage = injectRewindStoryImage(() => {
		const rewind = this.rewind();
		return rewind ? { username: this.username(), year: rewind.year } : null;
	});

	protected readonly previewAlt = computed(() => {
		const year = this.year() ?? 0;
		return this.isOwner()
			? this.text().ownerPreviewAlt(year)
			: this.text().visitorPreviewAlt(this.username(), year);
	});

	protected readonly sectionAreas = computed(() => {
		const rewind = this.rewind();
		const rows = [
			"results share",
			rewind?.aiRecap ? "recap recap" : null,
			this.hasHighlights() ? "highlights highlights" : null,
			this.hasPremiumStats() ? "stats stats" : null,
			rewind?.finishedGames.length ? "finished finished" : null,
			rewind?.otherYears.length ? "more more" : null
		];
		return rows
			.filter(row => row !== null)
			.map(row => `"${row}"`)
			.join(" ");
	});

	protected readonly shareOpen = signal(false);
	protected readonly skeletonRows = [0, 1, 2, 3, 4];
	protected readonly skeletonMonths = [0, 1];
	protected readonly skeletonPosters = [0, 1, 2, 3, 4, 5];

	protected retry() {
		this.resource.reload();
	}

	replaceRewind(rewind: Rewind) {
		const sameOwner =
			rewind.user.username.toLowerCase() ===
			this.username().toLowerCase();
		if (!sameOwner || rewind.year !== this.year()) return;
		this.resource.set(rewind);
	}
}
