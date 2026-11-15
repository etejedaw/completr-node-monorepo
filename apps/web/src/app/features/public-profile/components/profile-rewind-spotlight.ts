import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DOCUMENT,
	inject,
	input,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import {
	type RewindPeriod,
	type RewindPremiumAccess,
	type RewindYearSummary
} from "../../../core/models/rewind.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { InView } from "../../../shared/directives/in-view";
import { UiButton, UiEyebrow } from "../../../shared/ui";
import { RewindGenerateDialog } from "../../rewind/components/rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../../rewind/components/rewind-generate-dialog/rewind-generate-flow";
import { RewindPersonaRank } from "../../rewind/components/rewind-persona-rank/rewind-persona-rank";
import { DEFAULT_REWIND_LANGUAGE, formatHours } from "../../rewind/rewind-copy";
import { generationBlockMessageOf } from "../../rewind/rewind-generation-block";
import { canAnimateRewind } from "../../rewind/rewind-motion";
import { REWIND_YEAR_FILL_CLASS } from "../../rewind/rewind-tone";

const FAN_ROTATIONS = [-12, -6, 0, 6, 12];
const MOBILE_FAN_SIZE = 3;
const FAN_STEP_DEG = 6;
const FAN_LIFT_REM = 0.6;
const FAN_GATHER_PERCENT = 70;
const FAN_STAGGER_MS = 60;

@Component({
	selector: "app-profile-rewind-spotlight",
	imports: [
		UiEyebrow,
		RouterLink,
		GamePoster,
		InView,
		RewindGenerateDialog,
		RewindPersonaRank,
		UiButton
	],
	templateUrl: "./profile-rewind-spotlight.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileRewindSpotlight {
	readonly username = input.required<string>();
	readonly summary = input.required<RewindYearSummary>();
	readonly isSelf = input(false);
	readonly hasMoreYears = input(false);
	readonly premiumAccess = input<RewindPremiumAccess | null>(null);
	readonly period = input<RewindPeriod | null>(null);

	private readonly router = inject(Router);
	private readonly generatedHere = signal<ReadonlySet<string>>(new Set());

	protected readonly isGenerated = computed(
		() =>
			this.summary().isGenerated ||
			this.generatedHere().has(
				generationKey(this.username(), this.summary().year)
			)
	);
	protected readonly blockMessage = computed(() =>
		generationBlockMessageOf(
			{ ...this.summary(), isGenerated: this.isGenerated() },
			this.period(),
			DEFAULT_REWIND_LANGUAGE
		)
	);
	protected readonly generation = injectRewindGenerateFlow({
		username: () => this.username(),
		year: () => this.summary().year,
		onGenerated: rewind =>
			this.generatedHere.update(
				keys =>
					new Set([
						...keys,
						generationKey(rewind.user.username, rewind.year)
					])
			),
		onFinishedInDialog: rewind =>
			void this.router.navigate([
				"/user",
				this.username(),
				"rewind",
				rewind.year
			])
	});
	protected readonly mobileFanSize = MOBILE_FAN_SIZE;
	protected readonly yearFillClass = REWIND_YEAR_FILL_CLASS;
	protected readonly fanOpen = signal(
		!canAnimateRewind(inject(DOCUMENT).defaultView)
	);
	protected readonly covers = computed(() =>
		this.summary().covers.slice(0, FAN_ROTATIONS.length)
	);
	protected readonly leadLabel = computed(() =>
		this.summary().finishedCount > 0 ? "finished" : "started"
	);
	protected readonly leadCount = computed(() => {
		const { finishedCount, startedCount } = this.summary();
		return finishedCount > 0 ? finishedCount : startedCount;
	});
	protected readonly hours = computed(() =>
		formatHours(this.summary().hoursPlayed)
	);
	protected readonly ctaLabel = computed(() =>
		this.isSelf() ? "See your Rewind" : `See @${this.username()}'s Rewind`
	);
	protected readonly readyLine = computed(() =>
		this.isSelf()
			? "Your year in games is ready"
			: `@${this.username()}'s year in games is ready`
	);

	protected rotation(index: number): number {
		return this.fanOpen() ? this.fanSlot(index) * FAN_STEP_DEG : 0;
	}

	protected placement(index: number): string {
		const slot = this.fanSlot(index);
		return this.fanOpen()
			? `0 ${Math.abs(slot) * FAN_LIFT_REM}rem`
			: `${-slot * FAN_GATHER_PERCENT}% 0`;
	}

	protected fanDelay(index: number): number {
		return Math.abs(this.fanSlot(index)) * FAN_STAGGER_MS;
	}

	protected zIndex(index: number): number {
		return 10 - Math.abs(this.fanSlot(index));
	}

	protected teaserRotation(index: number): number {
		return this.fanSlot(index) * (FAN_STEP_DEG / 2);
	}

	private fanSlot(index: number): number {
		return index - (this.covers().length - 1) / 2;
	}
}

function generationKey(username: string, year: number): string {
	return `${username.toLowerCase()}:${year}`;
}
