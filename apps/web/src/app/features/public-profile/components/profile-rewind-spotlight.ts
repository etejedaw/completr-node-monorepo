import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type RewindYearSummary } from "../../../core/models/rewind.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiButton } from "../../../shared/ui";
import { formatHours } from "../../rewind/rewind-copy";

const FAN_ROTATIONS = [-12, -6, 0, 6, 12];
const MOBILE_FAN_SIZE = 3;

@Component({
	selector: "app-profile-rewind-spotlight",
	imports: [RouterLink, GamePoster, UiButton],
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
							class="m-0 font-display font-bold leading-[0.9] tracking-[-0.04em] tabular-nums text-fg text-[clamp(4.5rem,16vw,8rem)]"
						>
							<span class="sr-only">Rewind</span
							>{{ " " + summary().year }}
						</h2>
					</div>
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
					>
						@for (
							cover of covers();
							track cover.gameId;
							let i = $index
						) {
							<app-game-poster
								class="-mx-3 sm:-mx-4 w-24 sm:w-32 lg:w-36 aspect-[2/3] origin-bottom rounded-md ring-1 ring-line shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]"
								[class.max-md:hidden]="i >= mobileFanSize"
								[style.rotate.deg]="rotation(i)"
								[style.translate]="'0 ' + lift(i) + 'rem'"
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
		return this.fanSlot(index) * 6;
	}

	protected lift(index: number): number {
		return Math.abs(this.fanSlot(index)) * 0.6;
	}

	protected zIndex(index: number): number {
		return 10 - Math.abs(this.fanSlot(index));
	}

	private fanSlot(index: number): number {
		return index - (this.covers().length - 1) / 2;
	}
}
