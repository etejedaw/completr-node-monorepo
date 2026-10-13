import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";

@Component({
	selector: "app-game-runs",
	imports: [DatePipe],
	template: `
		<section
			class="bg-surface/60 border border-line rounded-card overflow-hidden"
			aria-labelledby="game-runs-heading"
		>
			<header
				class="flex items-center justify-between gap-2 px-4 pt-4 pb-3"
			>
				<h2
					id="game-runs-heading"
					class="m-0 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-fg-muted"
				>
					Your runs
				</h2>
				<button
					type="button"
					class="inline-flex items-center gap-1 h-8 pointer-coarse:min-h-[44px] px-2.5 -mr-1 rounded-md bg-transparent border-0 text-xs font-medium text-brand cursor-pointer transition hover:bg-brand-subtle"
					(click)="runAdded.emit()"
				>
					<span aria-hidden="true" class="material-icons text-base"
						>add</span
					>
					New run
				</button>
			</header>

			<dl
				class="m-0 mx-4 mb-3 grid grid-cols-3 rounded-md bg-input-bg/60 border border-line divide-x divide-line"
			>
				<div class="flex flex-col items-center py-2">
					<dt
						class="text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-fg-muted"
					>
						Runs
					</dt>
					<dd
						class="m-0 font-display text-lg font-bold text-fg tabular-nums"
					>
						{{ runs().length }}
					</dd>
				</div>
				<div class="flex flex-col items-center py-2">
					<dt
						class="text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-fg-muted"
					>
						Completed
					</dt>
					<dd
						class="m-0 font-display text-lg font-bold text-success tabular-nums"
					>
						{{ completedCount() }}
					</dd>
				</div>
				<div class="flex flex-col items-center py-2">
					<dt
						class="text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-fg-muted"
					>
						Played
					</dt>
					<dd
						class="m-0 font-display text-lg font-bold text-fg tabular-nums"
					>
						{{ hoursPlayed()
						}}<span class="ml-0.5 text-xs font-sans text-fg-muted"
							>h</span
						>
					</dd>
				</div>
			</dl>

			<ol class="list-none m-0 p-0 border-t border-line">
				@for (run of runs(); track run.id; let i = $index) {
					<li class="border-b border-line last:border-b-0">
						<button
							type="button"
							class="group relative w-full flex gap-3 pl-5 pr-4 py-3 pointer-coarse:min-h-[44px] text-left bg-transparent border-0 cursor-pointer transition hover:bg-white/[0.03]"
							[attr.aria-label]="
								'Run ' +
								(runs().length - i) +
								', ' +
								statusLabel(run.status) +
								' on ' +
								run.platform.abbreviation
							"
							(click)="runOpened.emit(run)"
						>
							<span
								aria-hidden="true"
								class="absolute left-0 inset-y-0 w-[3px] bg-current"
								[class]="statusIconColor(run.status)"
							></span>
							<span class="flex-1 min-w-0 flex flex-col gap-1.5">
								<span class="flex items-center gap-2">
									<span
										class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold"
										[class]="statusClass(run.status)"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm"
											>{{ statusIcon(run.status) }}</span
										>
										{{ statusLabel(run.status) }}
									</span>
									<span
										class="text-xs font-medium text-fg-secondary"
										>{{ run.platform.abbreviation }}</span
									>
									<span
										class="ml-auto text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-fg-muted"
										>#{{ runs().length - i }}</span
									>
								</span>
								@if (run.startedAt || run.finishedAt) {
									<span
										class="flex items-center gap-1.5 text-xs text-fg-muted tabular-nums"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm"
											>calendar_today</span
										>
										{{
											run.startedAt
												? (run.startedAt
													| date: "MMM d, y")
												: "?"
										}}
										<span aria-hidden="true">→</span>
										{{
											run.finishedAt
												? (run.finishedAt
													| date: "MMM d, y")
												: "now"
										}}
									</span>
								}
								@if (run.realDuration || run.userRating) {
									<span
										class="flex items-center gap-3 text-xs text-fg-muted tabular-nums"
									>
										@if (run.realDuration) {
											<span
												class="inline-flex items-center gap-1"
											>
												<span
													aria-hidden="true"
													class="material-icons text-sm"
													>schedule</span
												>
												{{ run.realDuration }}h
											</span>
										}
										@if (run.userRating) {
											<span
												class="inline-flex items-center gap-0.5 text-rating"
											>
												<span
													aria-hidden="true"
													class="material-icons text-sm"
													>star</span
												>
												{{ run.userRating }}
											</span>
										}
									</span>
								}
								@if (run.latestProgress) {
									<span
										class="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-input-bg/60 text-xs text-fg-secondary"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm text-brand"
											>bookmark</span
										>
										<span class="line-clamp-2">{{
											run.latestProgress.note
										}}</span>
									</span>
								}
							</span>
							<span
								aria-hidden="true"
								class="material-icons self-center text-base text-fg-muted transition group-hover:text-fg group-hover:translate-x-0.5"
								>chevron_right</span
							>
						</button>
					</li>
				}
			</ol>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameRuns {
	readonly runs = input.required<BacklogEntry[]>();

	readonly runOpened = output<BacklogEntry>();
	readonly runAdded = output<void>();

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusIconColor = backlogStatusIconColor;
	protected readonly statusLabel = backlogStatusLabel;

	protected readonly completedCount = computed(
		() => this.runs().filter(run => run.status === "completed").length
	);
	protected readonly hoursPlayed = computed(() =>
		this.runs().reduce((total, run) => total + (run.realDuration ?? 0), 0)
	);
}
