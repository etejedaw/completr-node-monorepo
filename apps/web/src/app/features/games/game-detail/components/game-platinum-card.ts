import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type BacklogEntry, type GamePlatinum } from "../../../../core/models";
import { PlatinumTrophy } from "../../../../shared/components/platinum-trophy/platinum-trophy";
import { UiButton } from "../../../../shared/ui";

@Component({
	selector: "app-game-platinum-card",
	imports: [DatePipe, PlatinumTrophy, UiButton],
	template: `
		<section
			class="bg-surface/60 border border-line rounded-card p-4"
			aria-labelledby="game-platinum-heading"
		>
			<header class="flex items-center justify-between gap-2 mb-2">
				<h2
					id="game-platinum-heading"
					class="m-0 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-fg-muted"
				>
					Platinum
				</h2>
				@if (platinum()) {
					<button
						uiButton
						variant="ghost"
						size="sm"
						type="button"
						(click)="editRequested.emit()"
					>
						<span aria-hidden="true" class="material-icons text-sm"
							>edit</span
						>
						Edit
					</button>
				}
			</header>
			@if (platinum(); as platinum) {
				<div class="flex items-start gap-3">
					<app-platinum-trophy
						scope="game"
						iconSizeClass="text-3xl"
					/>
					<div class="min-w-0 flex flex-col gap-1 text-sm">
						<p class="m-0 font-semibold text-fg">
							@if (platinum.platinumedAt) {
								Platinumed on
								{{ platinum.platinumedAt | date: "MMM d, y" }}
							} @else {
								Platinumed
							}
						</p>
						@if (details()) {
							<p class="m-0 text-xs text-fg-secondary">
								{{ details() }}
							</p>
						}
						@if (platinum.notes) {
							<p
								class="m-0 text-xs text-fg-muted whitespace-pre-line"
							>
								{{ platinum.notes }}
							</p>
						}
					</div>
				</div>
			} @else {
				<p class="m-0 mb-3 text-sm text-fg-muted">
					Got every trophy? Keep track of it here.
				</p>
				<button
					uiButton
					variant="secondary"
					size="sm"
					type="button"
					[block]="true"
					(click)="editRequested.emit()"
				>
					<span aria-hidden="true" class="material-icons text-sm"
						>emoji_events</span
					>
					Mark as platinumed
				</button>
			}
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamePlatinumCard {
	readonly platinum = input<GamePlatinum | null>(null);
	readonly runs = input<BacklogEntry[]>([]);
	readonly platformName = input<string | null>(null);

	readonly editRequested = output<void>();

	protected readonly details = computed(() => {
		const platinum = this.platinum();
		if (!platinum) return "";
		const runs = this.runs();
		const runIndex = runs.findIndex(run => run.id === platinum.backlogId);
		const parts = [
			this.platformName(),
			runIndex >= 0 ? `Run #${runs.length - runIndex}` : null
		];
		return parts.filter(Boolean).join(" · ");
	});
}
