import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DOCUMENT,
	inject,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type RewindYearSummary } from "../../../core/models/rewind.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { InView } from "../../../shared/directives/in-view";
import { UiButton } from "../../../shared/ui";
import { RewindPersonaRank } from "../../rewind/components/rewind-persona-rank/rewind-persona-rank";
import { formatHours } from "../../rewind/rewind-copy";
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
	imports: [RouterLink, GamePoster, InView, RewindPersonaRank, UiButton],
	template: `
		<section
			class="relative isolate overflow-hidden rounded-card border border-line bg-surface p-5 sm:p-8 lg:p-10"
			aria-labelledby="profile-rewind-heading"
		>
			<div
				aria-hidden="true"
				class="absolute -top-24 -right-24 -z-10 size-[28rem] rounded-full bg-[radial-gradient(circle,var(--color-brand-glow),transparent_65%)]"
			></div>
			<div
				aria-hidden="true"
				class="absolute -bottom-32 left-1/3 -z-10 size-[24rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-nav-queue)_18%,transparent),transparent_65%)]"
			></div>
			<div
				class="flex flex-col-reverse gap-8 lg:flex-row lg:items-center lg:justify-between"
			>
				<div class="flex flex-col gap-5 min-w-0">
					<div class="flex flex-col">
						<span
							class="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
							>Rewind</span
						>
						<h2
							id="profile-rewind-heading"
							class="m-0 font-display font-bold leading-[0.9] tracking-[-0.04em] tabular-nums text-[clamp(4.5rem,16vw,8rem)]"
						>
							<span class="sr-only">Rewind</span>{{ " "
							}}<span [class]="yearFillClass">{{
								summary().year
							}}</span>
						</h2>
					</div>
					<app-rewind-persona-rank
						size="compact"
						[code]="summary().persona"
					/>
					@if (covers().length === 0) {
						<p class="m-0 text-base text-fg-secondary">
							{{ readyLine() }}
						</p>
					}
					<dl class="m-0 flex flex-wrap gap-x-8 gap-y-3">
						<div class="flex flex-col-reverse">
							<dt class="text-sm text-fg-secondary">
								{{ leadLabel() }}
							</dt>
							<dd
								class="m-0 font-display text-3xl font-semibold leading-none tabular-nums text-fg"
							>
								{{ leadCount() }}
							</dd>
						</div>
						<div class="flex flex-col-reverse">
							<dt class="text-sm text-fg-secondary">h played</dt>
							<dd
								class="m-0 font-display text-3xl font-semibold leading-none tabular-nums text-fg"
							>
								{{ hours() }}
							</dd>
						</div>
					</dl>
					<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<a
							uiButton
							variant="primary"
							class="max-sm:!w-full max-sm:min-h-[44px] tap:min-h-[44px]"
							[routerLink]="[
								'/user',
								username(),
								'rewind',
								summary().year
							]"
							>{{ ctaLabel() }}</a
						>
						@if (hasMoreYears()) {
							<a
								uiButton
								variant="ghost"
								class="max-sm:!w-full max-sm:min-h-[44px] tap:min-h-[44px]"
								[routerLink]="['/user', username(), 'rewind']"
								>Past rewinds</a
							>
						}
					</div>
				</div>
				@if (covers().length > 0) {
					<div
						aria-hidden="true"
						class="relative flex shrink-0 items-end justify-center self-center lg:pr-6 h-44 sm:h-56 lg:h-64"
						appInView
						(inViewChange)="$event && fanOpen.set(true)"
					>
						@for (
							cover of covers();
							track cover.gameId;
							let i = $index
						) {
							<app-game-poster
								class="-mx-3 sm:-mx-4 w-24 sm:w-32 lg:w-36 aspect-[2/3] origin-bottom rounded-md ring-1 ring-line shadow-[0_18px_40px_-18px_var(--color-canvas)] motion-safe:transition-[rotate,translate] motion-safe:duration-[700ms] motion-safe:ease-[cubic-bezier(0.2,1.1,0.3,1)]"
								[class.max-md:hidden]="i >= mobileFanSize"
								[style.rotate.deg]="rotation(i)"
								[style.translate]="placement(i)"
								[style.transition-delay.ms]="fanDelay(i)"
								[style.z-index]="zIndex(i)"
								[src]="cover.coverUrl"
								[title]="cover.title"
								[width]="200"
							/>
						}
					</div>
				}
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileRewindSpotlight {
	readonly username = input.required<string>();
	readonly summary = input.required<RewindYearSummary>();
	readonly isSelf = input(false);
	readonly hasMoreYears = input(false);

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

	private fanSlot(index: number): number {
		return index - (this.covers().length - 1) / 2;
	}
}
