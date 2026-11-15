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

import {
	type Rewind,
	type RewindLanguage
} from "../../../core/models/rewind.model";
import { AuthService } from "../../../core/services/auth";
import { ProfileAccessState } from "../../../shared/components/profile-access-state/profile-access-state";
import { UiButton, UiPlainEmptyState, UiSkeleton } from "../../../shared/ui";
import { RewindDesignOutlet } from "../components/rewind-design-outlet/rewind-design-outlet";
import { RewindGenerateDialog } from "../components/rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../components/rewind-generate-dialog/rewind-generate-flow";
import { RewindService } from "../rewind";
import {
	DEFAULT_REWIND_LANGUAGE,
	parseRewindYear,
	rewindCopy
} from "../rewind-copy";
import { type RewindLoadError, rewindLoadError } from "../rewind-errors";
import { generationBlockMessageOf } from "../rewind-generation-block";

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

@Component({
	selector: "app-rewind-detail",
	imports: [
		RouterLink,
		ProfileAccessState,
		RewindDesignOutlet,
		RewindGenerateDialog,
		UiButton,
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

	private readonly generationContext = rxResource({
		params: () =>
			this.loadError() === "not_generated" ? this.username() : undefined,
		stream: ({ params: username }) => this.rewindService.getYears(username)
	});

	private readonly generationYears = computed(() =>
		this.generationContext.hasValue()
			? this.generationContext.value()
			: null
	);

	protected readonly isGenerationContextLoading =
		this.generationContext.isLoading;

	protected readonly generationPremiumAccess = computed(
		() =>
			this.rewind()?.premiumAccess ??
			this.generationYears()?.premiumAccess ??
			null
	);

	protected readonly generationBlockMessage = computed(() => {
		const years = this.generationYears();
		const summary = years?.years.find(year => year.year === this.year());
		return generationBlockMessageOf(
			summary ?? null,
			years?.period ?? null,
			this.language()
		);
	});

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

	protected readonly isOwner = computed(
		() =>
			!!this.authService.user() &&
			this.authService.user()?.username.toLowerCase() ===
				this.username().toLowerCase()
	);

	protected readonly skeletonRows = [0, 1, 2, 3, 4];

	protected retry() {
		this.resource.reload();
	}

	protected readonly generation = injectRewindGenerateFlow({
		username: () => this.username(),
		year: () => this.year() ?? 0,
		onGenerated: rewind => this.replaceRewind(rewind)
	});

	protected replaceRewind(rewind: Rewind) {
		const sameOwner =
			rewind.user.username.toLowerCase() ===
			this.username().toLowerCase();
		if (!sameOwner || rewind.year !== this.year()) return;
		this.resource.set(rewind);
	}
}
