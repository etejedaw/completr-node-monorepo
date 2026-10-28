import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { type Rewind } from "../../../core/models/rewind.model";
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
import { RewindFinishedGames } from "../components/rewind-finished-games/rewind-finished-games";
import { RewindHighlights } from "../components/rewind-highlights/rewind-highlights";
import { RewindMoreYears } from "../components/rewind-more-years/rewind-more-years";
import { RewindShareActions } from "../components/rewind-share-actions/rewind-share-actions";
import {
	RewindTally,
	rewindTallyRows
} from "../components/rewind-tally/rewind-tally";
import { RewindService } from "../rewind";
import { parseRewindYear, rewindSummarySentence } from "../rewind-copy";
import { rewindLoadError } from "../rewind-errors";
import { injectRewindStoryImage } from "../rewind-story-image";

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
		RewindShareActions,
		RewindTally,
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

	protected readonly loadError = computed(() =>
		this.year() === null
			? "not_found"
			: rewindLoadError(this.resource.error())
	);

	protected readonly hasHighlights = computed(() => {
		const highlights = this.rewind()?.highlights;
		return (
			!!highlights &&
			Object.values(highlights).some(highlight => highlight !== null)
		);
	});

	protected readonly isOwner = computed(
		() =>
			!!this.authService.user() &&
			this.authService.user()?.username.toLowerCase() ===
				this.username().toLowerCase()
	);

	protected readonly eyebrow = computed(() =>
		this.isOwner() ? "Your Rewind" : `@${this.username()}'s Rewind`
	);

	protected readonly summary = computed(() => {
		const rewind = this.rewind();
		return rewind ? rewindSummarySentence(rewind.totals) : "";
	});

	protected readonly tally = computed(() => {
		const rewind = this.rewind();
		return rewind ? rewindTallyRows(rewind.totals) : [];
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
		const year = this.year();
		return this.isOwner()
			? `Your ${year} Rewind`
			: `@${this.username()}'s ${year} Rewind`;
	});

	protected readonly sectionAreas = computed(() => {
		const rewind = this.rewind();
		const rows = [
			"results share",
			this.hasHighlights() ? "highlights highlights" : null,
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
}
