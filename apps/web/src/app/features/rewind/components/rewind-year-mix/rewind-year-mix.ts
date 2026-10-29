import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	REWIND_LENGTH_RANGES,
	type RewindLanguage,
	type RewindLengthBucket,
	type RewindReleaseDecade,
	type RewindYearMix as RewindYearMixData
} from "../../../../core/models/rewind.model";
import { ProfileSectionHeader } from "../../../public-profile/components/profile-section-header";
import {
	formatPercent,
	formatRewindNumber,
	rewindCopy
} from "../../rewind-copy";
import { RewindReveal } from "../../rewind-reveal";
import {
	type LengthMixRow,
	type ReleaseDecadeColumn
} from "./rewind-year-mix.model";

function safeCount(value: number | undefined): number {
	return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function percentOf(value: number, max: number): number {
	return max > 0 ? (value / max) * 100 : 0;
}

export function lengthMixRows(buckets: RewindLengthBucket[]): LengthMixRow[] {
	const countByRange = new Map(
		buckets.map(bucket => [bucket.range, safeCount(bucket.count)])
	);
	const counts = REWIND_LENGTH_RANGES.map(
		range => countByRange.get(range) ?? 0
	);
	const total = counts.reduce((sum, count) => sum + count, 0);
	if (total <= 0) return [];
	const max = Math.max(...counts);
	return REWIND_LENGTH_RANGES.map((range, index) => ({
		range,
		count: counts[index],
		sharePercent: (counts[index] / total) * 100,
		widthPercent: percentOf(counts[index], max)
	}));
}

export function releaseDecadeColumns(
	decades: RewindReleaseDecade[]
): ReleaseDecadeColumn[] {
	const counted = decades
		.filter(entry => Number.isInteger(entry.decade))
		.map(entry => ({ decade: entry.decade, count: safeCount(entry.count) }))
		.filter(entry => entry.count > 0)
		.sort((first, second) => first.decade - second.decade);
	const max = Math.max(0, ...counted.map(entry => entry.count));
	return counted.map(entry => ({
		...entry,
		heightPercent: percentOf(entry.count, max),
		isPeak: entry.count === max
	}));
}

export function hasYearMixCharts(mix: RewindYearMixData): boolean {
	return (
		lengthMixRows(mix.lengthMix).length > 0 ||
		releaseDecadeColumns(mix.releaseDecades).length > 0
	);
}

@Component({
	selector: "app-rewind-year-mix",
	imports: [ProfileSectionHeader, RewindReveal],
	templateUrl: "./rewind-year-mix.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindYearMix {
	readonly mix = input.required<RewindYearMixData>();
	readonly language = input<RewindLanguage>("en");

	protected readonly copy = computed(
		() => rewindCopy(this.language()).yearMix
	);

	protected readonly lengthRows = computed(() =>
		lengthMixRows(this.mix().lengthMix)
	);
	protected readonly decadeColumns = computed(() =>
		releaseDecadeColumns(this.mix().releaseDecades)
	);

	protected readonly hasAnyChart = computed(
		() => this.lengthRows().length > 0 || this.decadeColumns().length > 0
	);

	protected readonly topDecadeText = computed(() => {
		const peaks = this.decadeColumns().filter(column => column.isPeak);
		if (peaks.length !== 1) return null;
		const copy = this.copy();
		return copy.topDecade(copy.decadeLabel(peaks[0].decade));
	});

	protected readonly withoutHoursText = computed(() =>
		this.missingText(this.mix().gamesWithoutHours, this.copy().withoutHours)
	);
	protected readonly withoutReleaseText = computed(() =>
		this.missingText(
			this.mix().gamesWithoutRelease,
			this.copy().withoutRelease
		)
	);

	protected number(value: number): string {
		return formatRewindNumber(value, this.language());
	}

	protected percent(value: number): string {
		return formatPercent(Math.round(value), this.language());
	}

	protected decadeLabel(decade: number): string {
		return this.copy().decadeLabel(decade);
	}

	private missingText(
		count: number,
		describe: (count: string) => string
	): string | null {
		const games = safeCount(count);
		return games > 0 ? describe(this.number(games)) : null;
	}
}
