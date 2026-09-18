import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../../core/services/auth";
import { UiPagination, UiProgress } from "../../../shared/ui";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import {
	FranchiseDetail as FranchiseDetailData,
	FranchisesService
} from "../franchises";

const PAGE_SIZE = 24;

const STATUS_LABELS: Record<string, string> = {
	completed: "Completed",
	playing: "Playing",
	not_started: "To play",
	abandoned: "Dropped",
	endless: "Endless"
};

@Component({
	selector: "app-franchise-detail",
	imports: [UiPagination, UiProgress, GameCoverCard],
	templateUrl: "./franchise-detail.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FranchiseDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly franchisesService = inject(FranchisesService);
	private readonly authService = inject(AuthService);

	protected readonly code = signal("");
	protected readonly detail = signal<FranchiseDetailData | null>(null);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly isLoading = signal(true);
	protected readonly notFound = signal(false);
	protected readonly tracked = signal(false);
	protected readonly toggling = signal(false);
	protected readonly isLoggedIn = this.authService.isLoggedIn;

	ngOnInit() {
		if (this.authService.token() && !this.authService.user()) {
			this.authService.loadUser().subscribe({
				next: () => this.init(),
				error: () => this.init()
			});
		} else {
			this.init();
		}
	}

	private init() {
		this.code.set(this.route.snapshot.paramMap.get("code") ?? "");
		this.load();
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	protected statusLabel(status: string | null) {
		return status ? (STATUS_LABELS[status] ?? "") : "";
	}

	private load() {
		this.isLoading.set(true);
		this.notFound.set(false);
		this.franchisesService
			.getFranchiseByCode(this.code(), {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: data => {
					this.detail.set(data);
					this.tracked.set(data.isTracked);
					this.isLoading.set(false);
				},
				error: () => {
					this.notFound.set(true);
					this.isLoading.set(false);
				}
			});
	}

	protected trackBtnClass() {
		const base =
			"ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition cursor-pointer disabled:opacity-50 ";
		return this.tracked()
			? base + "border-brand bg-brand/20 text-brand"
			: base +
					"border-line text-fg-muted hover:text-fg hover:border-brand/40";
	}

	protected toggleTrack() {
		if (this.toggling()) return;
		const next = !this.tracked();
		this.toggling.set(true);
		const req$ = next
			? this.franchisesService.trackFranchise(this.code())
			: this.franchisesService.untrackFranchise(this.code());
		req$.subscribe({
			next: () => {
				this.tracked.set(next);
				this.toggling.set(false);
			},
			error: () => this.toggling.set(false)
		});
	}
}
