import { DatePipe } from "@angular/common";
import { httpResource } from "@angular/common/http";
import {
	afterRenderEffect,
	ChangeDetectionStrategy,
	Component,
	computed,
	DOCUMENT,
	inject,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { environment } from "../../../environments/environment";
import { InfoPageLinks } from "../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { UiButton, UiSkeleton } from "../../shared/ui";
import { injectLibraryPosters } from "../backlog/library-posters";
import { ReleaseEntryCard } from "./components/release-entry";
import {
	type ChangelogResponse,
	type ReleaseView,
	toReleaseViews
} from "./release.model";

const OLDER_PAGE_SIZE = 8;

interface PendingScroll {
	anchor: string;
	behavior: ScrollBehavior;
}

interface MonthSummary {
	month: string;
	count: number;
}

interface MonthGroup {
	month: string;
	releases: ReleaseView[];
}

function monthAnchor(month: string): string {
	return `month-${month}`;
}

function groupByMonth(releases: ReleaseView[]): MonthGroup[] {
	const groups: MonthGroup[] = [];
	for (const release of releases) {
		const month = release.date.slice(0, 7);
		const last = groups.at(-1);
		if (last?.month === month) last.releases.push(release);
		else groups.push({ month, releases: [release] });
	}
	return groups;
}

@Component({
	selector: "app-whats-new-page",
	imports: [
		DatePipe,
		RouterLink,
		LibraryHero,
		ReleaseEntryCard,
		InfoPageLinks,
		UiButton,
		UiSkeleton
	],
	templateUrl: "./whats-new-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPage {
	private readonly route = inject(ActivatedRoute);
	private readonly document = inject(DOCUMENT);

	protected readonly posters = injectLibraryPosters();
	protected readonly changelog = httpResource<ChangelogResponse>(
		() => `${environment.apiUrl}/changelog`
	);

	protected readonly releases = computed(() =>
		this.changelog.hasValue()
			? toReleaseViews(this.changelog.value().releases)
			: []
	);
	protected readonly latest = computed(() => this.releases()[0] ?? null);
	protected readonly older = computed(() => this.releases().slice(1));

	private readonly olderLimit = signal(OLDER_PAGE_SIZE);
	protected readonly visibleGroups = computed(() =>
		groupByMonth(this.older().slice(0, this.olderLimit()))
	);
	protected readonly hiddenCount = computed(() =>
		Math.max(0, this.older().length - this.olderLimit())
	);
	protected readonly months = computed(() =>
		groupByMonth(this.older()).map((group): MonthSummary => ({
			month: group.month,
			count: group.releases.length
		}))
	);
	protected readonly firstDate = computed(
		() => this.releases().at(-1)?.date ?? null
	);

	private readonly pendingScroll = signal<PendingScroll | null>(
		this.route.snapshot.fragment
			? { anchor: this.route.snapshot.fragment, behavior: "auto" }
			: null
	);

	constructor() {
		afterRenderEffect(() => {
			const pending = this.pendingScroll();
			if (!pending || this.releases().length === 0) return;
			const target = this.document.getElementById(pending.anchor);
			if (!target && this.revealRelease(pending.anchor)) return;
			this.pendingScroll.set(null);
			target?.scrollIntoView({
				behavior: pending.behavior,
				block: "start"
			});
		});
	}

	protected showOlder() {
		this.olderLimit.update(limit => limit + OLDER_PAGE_SIZE);
	}

	protected jumpToMonth(month: string) {
		const lastIndex = this.older().reduce(
			(found, release, index) =>
				release.date.startsWith(month) ? index : found,
			-1
		);
		if (lastIndex >= this.olderLimit()) this.olderLimit.set(lastIndex + 1);
		const reduceMotion = this.document.defaultView?.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		this.pendingScroll.set({
			anchor: monthAnchor(month),
			behavior: reduceMotion ? "auto" : "smooth"
		});
	}

	protected monthAnchor(month: string): string {
		return monthAnchor(month);
	}

	private revealRelease(anchor: string): boolean {
		const index = this.older().findIndex(r => r.anchor === anchor);
		if (index < this.olderLimit()) return false;
		this.olderLimit.set(index + 1);
		return true;
	}
}
