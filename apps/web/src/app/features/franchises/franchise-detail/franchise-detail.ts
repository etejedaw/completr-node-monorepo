import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal
} from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { map } from "rxjs";

import { type BacklogStatus, type Game } from "../../../core/models";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { UiButton, UiEmptyState, UiPagination } from "../../../shared/ui";
import { backlogStatusLabel } from "../../../shared/utils/backlog-status";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import { injectFranchiseTracking } from "../franchise-tracking";
import { FranchisesService } from "../franchises";
import { type FranchiseDetail as FranchiseDetailData } from "../franchises.model";

const PAGE_SIZE = 24;

@Component({
	selector: "app-franchise-detail",
	imports: [
		RouterLink,
		CoverGrid,
		GameCoverCard,
		LibraryHero,
		UiButton,
		UiEmptyState,
		UiPagination
	],
	templateUrl: "./franchise-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FranchiseDetail {
	private readonly route = inject(ActivatedRoute);
	private readonly franchisesService = inject(FranchisesService);

	protected readonly limit = PAGE_SIZE;

	private readonly code = toSignal(
		this.route.paramMap.pipe(map(params => params.get("code") ?? "")),
		{ initialValue: this.route.snapshot.paramMap.get("code") ?? "" }
	);

	protected readonly offset = linkedSignal({
		source: this.code,
		computation: () => 0
	});

	protected readonly page = rxResource({
		params: () => ({ code: this.code(), offset: this.offset() }),
		stream: ({ params }) =>
			this.franchisesService.getFranchiseByCode(params.code, {
				limit: PAGE_SIZE,
				offset: params.offset
			})
	});

	private readonly loadedPage = computed(() =>
		this.page.hasValue() ? this.page.value() : undefined
	);

	protected readonly detail = linkedSignal<
		FranchiseDetailData | undefined,
		FranchiseDetailData | undefined
	>({
		source: this.loadedPage,
		computation: (value, previous) => {
			if (value) return value;
			const kept = previous?.value;
			return kept?.franchise.code === this.code() ? kept : undefined;
		}
	});

	protected readonly isFirstLoad = computed(
		() => !this.detail() && this.page.isLoading()
	);

	protected readonly notFound = computed(
		() =>
			(this.page.error() as HttpErrorResponse | undefined)?.status === 404
	);

	private readonly tracking = injectFranchiseTracking({
		onMissing: () => this.page.reload()
	});

	private readonly trackable = computed(() => {
		const current = this.detail();
		return current
			? {
					code: current.franchise.code,
					name: current.franchise.name,
					isTracked: current.isTracked
				}
			: undefined;
	});

	protected readonly tracked = computed(() => {
		const franchise = this.trackable();
		return franchise ? this.tracking.isTracked(franchise) : false;
	});

	protected readonly toggling = computed(() => {
		const franchise = this.trackable();
		return franchise ? this.tracking.isPending(franchise) : false;
	});

	protected readonly openBacklogQuickAdd = injectBacklogQuickAdd(() =>
		this.page.reload()
	);

	protected readonly heroPosters = computed(() =>
		(this.detail()?.games ?? []).map(game => ({
			src: game.backgroundUrl,
			title: game.title
		}))
	);

	protected goToOffset(offset: number) {
		this.offset.set(offset);
	}

	protected statusLabel(status: string | null) {
		return status ? backlogStatusLabel(status as BacklogStatus) : undefined;
	}

	protected releaseYear(game: Game) {
		return game.releaseAt
			? String(new Date(game.releaseAt).getUTCFullYear())
			: undefined;
	}

	protected toggleTrack() {
		const franchise = this.trackable();
		if (franchise) this.tracking.toggle(franchise);
	}
}
