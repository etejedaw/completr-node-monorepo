import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";

@Component({
	selector: "app-game-runs",
	imports: [DatePipe],
	template: `
		<section
			class="bg-surface/60 border border-line rounded-card p-4"
			aria-labelledby="game-runs-heading"
		>
			<header class="flex items-center justify-between gap-2 mb-3">
				<h2
					id="game-runs-heading"
					class="m-0 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-fg-muted"
				>
					Your runs
				</h2>
				<button
					type="button"
					class="inline-flex items-center gap-1 h-8 px-2.5 -mr-1 rounded-md bg-transparent border-0 text-xs font-medium text-brand cursor-pointer transition hover:bg-brand-subtle"
					(click)="runAdded.emit()"
				>
					<span aria-hidden="true" class="material-icons text-base"
						>add</span
					>
					New run
				</button>
			</header>
			<ol class="list-none m-0 p-0 flex flex-col gap-2">
				@for (run of runs(); track run.id) {
					<li>
						<button
							type="button"
							class="w-full text-left flex flex-col gap-1.5 p-3 bg-input-bg/70 border border-line rounded-card cursor-pointer transition hover:border-brand/50"
							(click)="runOpened.emit(run)"
						>
							<span class="flex items-center gap-2">
								<span
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
									[class]="statusClass(run.status)"
								>
									<span
										aria-hidden="true"
										class="material-icons text-sm"
										>{{ statusIcon(run.status) }}</span
									>
									{{ statusLabel(run.status) }}
								</span>
								<span class="text-xs text-fg-muted">{{
									run.platform.abbreviation
								}}</span>
								<span
									aria-hidden="true"
									class="material-icons text-base text-fg-muted ml-auto"
									>chevron_right</span
								>
							</span>
							<span
								class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted"
							>
								@if (run.finishedAt) {
									<span
										class="inline-flex items-center gap-1"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm"
											>event_available</span
										>
										{{ run.finishedAt | date: "MMM d, y" }}
									</span>
								} @else if (run.startedAt) {
									<span
										class="inline-flex items-center gap-1"
									>
										<span
											aria-hidden="true"
											class="material-icons text-sm"
											>play_arrow</span
										>
										{{ run.startedAt | date: "MMM d, y" }}
									</span>
								}
								@if (run.realDuration) {
									<span class="tabular-nums"
										>{{ run.realDuration }}h played</span
									>
								}
								@if (run.userRating) {
									<span
										class="inline-flex items-center gap-0.5 text-warning tabular-nums"
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
							@if (run.latestProgress) {
								<span
									class="flex items-start gap-1.5 text-xs text-fg-secondary"
								>
									<span
										aria-hidden="true"
										class="material-icons text-sm text-brand"
										>bookmark</span
									>
									<span class="italic line-clamp-2">{{
										run.latestProgress.note
									}}</span>
								</span>
							}
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
	protected readonly statusLabel = backlogStatusLabel;
}
