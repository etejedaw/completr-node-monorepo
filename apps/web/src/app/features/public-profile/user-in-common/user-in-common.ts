import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { UiPagination } from "../../../shared/ui";
import {
	type ComparisonDimension,
	PublicLibraryService
} from "../services/public-library.service";
import { type GameSummary } from "../services/types";

const PAGE_SIZE = 50;

const DIMENSIONS: { value: ComparisonDimension; label: string }[] = [
	{ value: "completed", label: "Completed" },
	{ value: "not_started", label: "To play" }
];

@Component({
	selector: "app-user-in-common",
	imports: [RouterLink, UiPagination, GameCoverCard],
	templateUrl: "./user-in-common.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserInCommon implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly libraryService = inject(PublicLibraryService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly games = signal<GameSummary[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly by = signal<ComparisonDimension>("completed");
	protected readonly dimensions = DIMENSIONS;
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly dimensionLabel = computed(
		() => DIMENSIONS.find(d => d.value === this.by())?.label ?? "Completed"
	);

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
		const username = this.route.snapshot.paramMap.get("username") ?? "";
		this.username.set(username);
		const rawBy = this.route.snapshot.queryParamMap.get("by");
		this.by.set(
			DIMENSIONS.some(d => d.value === rawBy)
				? (rawBy as ComparisonDimension)
				: "completed"
		);
		this.load();
	}

	protected dimBtnClass(value: ComparisonDimension) {
		const base =
			"px-3 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ";
		return this.by() === value
			? base + "border-brand bg-brand/20 text-brand"
			: base +
					"border-line text-fg-muted hover:text-fg hover:border-brand/40";
	}

	protected changeDimension(by: ComparisonDimension) {
		if (by === this.by()) return;
		this.by.set(by);
		this.offset.set(0);
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { by },
			queryParamsHandling: "merge"
		});
		this.load();
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	private load() {
		this.isLoading.set(true);
		this.error.set(null);
		this.libraryService
			.getComparison(this.username(), this.by(), {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: data => {
					this.games.set(
						data.inCommon.map(g => ({
							id: g.id,
							code: g.code,
							title: g.title,
							backgroundUrl: g.backgroundUrl ?? undefined
						}))
					);
					this.total.set(data.counts.inCommon);
					this.isLoading.set(false);
				},
				error: err => {
					if (err.status === 403) this.error.set("private");
					else if (err.status === 404) this.error.set("not_found");
					this.isLoading.set(false);
				}
			});
	}
}
