import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject
} from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { map } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	LibraryHero,
	type LibraryHeroPoster
} from "../../../shared/components/library-hero/library-hero";
import { UiButton, UiPlainEmptyState, UiSkeleton } from "../../../shared/ui";
import { ProfileAccessState } from "../../public-profile/components/profile-access-state";
import { RewindYearCard } from "../components/rewind-year-card/rewind-year-card";
import { RewindService } from "../rewind";
import { rewindLoadError } from "../rewind-errors";

@Component({
	selector: "app-rewind-archive",
	imports: [
		RouterLink,
		LibraryHero,
		ProfileAccessState,
		RewindYearCard,
		UiButton,
		UiPlainEmptyState,
		UiSkeleton
	],
	templateUrl: "./rewind-archive.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindArchive {
	private readonly route = inject(ActivatedRoute);
	private readonly rewindService = inject(RewindService);
	private readonly authService = inject(AuthService);

	protected readonly username = toSignal(
		this.route.paramMap.pipe(map(params => params.get("username") ?? "")),
		{ initialValue: this.route.snapshot.paramMap.get("username") ?? "" }
	);

	private readonly archive = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) =>
			this.rewindService
				.getYears(username)
				.pipe(map(result => ({ username, years: result.years })))
	});

	protected readonly years = computed(() => {
		if (!this.archive.hasValue()) return null;
		const { username, years } = this.archive.value();
		return username === this.username() ? years : null;
	});

	protected readonly loadError = computed(() =>
		rewindLoadError(this.archive.error())
	);

	protected readonly posters = computed<LibraryHeroPoster[]>(() =>
		(this.years() ?? []).flatMap(summary =>
			summary.covers.map(cover => ({
				src: cover.coverUrl,
				title: cover.title
			}))
		)
	);

	protected readonly subtitle = computed(() => {
		const username = this.username();
		const isOwner =
			this.authService.user()?.username.toLowerCase() ===
			username.toLowerCase();
		return isOwner
			? "Every year you've played, one page each."
			: `Every year @${username} has played, one page each.`;
	});

	protected readonly skeletonCards = [0, 1, 2, 3];

	protected retry() {
		this.archive.reload();
	}
}
