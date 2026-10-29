import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	output,
	signal
} from "@angular/core";

import { type Rewind } from "../../../../core/models/rewind.model";
import { PremiumOnly } from "../../../../shared/directives/premium-only";
import { UiAlert, UiButton } from "../../../../shared/ui";
import { RewindService } from "../../rewind";
import {
	type RewindAiRecapError,
	rewindAiRecapError
} from "../../rewind-errors";
import { RewindGenerateDialog } from "../rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../rewind-generate-dialog/rewind-generate-flow";
import {
	formatPanelDate,
	REWIND_OWNER_PANEL_COPY
} from "./rewind-owner-panel.copy";

const AI_RECAP_ERRORS_THAT_CHANGE_THE_REWIND: readonly RewindAiRecapError[] = [
	"exists",
	"premium_required"
];

@Component({
	selector: "app-rewind-owner-panel",
	imports: [PremiumOnly, RewindGenerateDialog, UiAlert, UiButton],
	template: `
		@if (rewind().ownerControls; as controls) {
			<section
				class="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5"
				aria-labelledby="rewind-owner-panel-heading"
				[attr.lang]="rewind().language"
			>
				<div
					class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-col gap-1 min-w-0">
						<h2
							id="rewind-owner-panel-heading"
							class="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand"
						>
							{{ copy().eyebrow }}
						</h2>
						<p class="m-0 text-sm text-fg-secondary">
							{{ copy().onlyYou }}
						</p>
						<p class="m-0 text-sm text-fg tabular-nums">
							{{
								copy().regenerationsLeft(
									controls.regenerationsLeft
								)
							}}
						</p>
						@if (graceLine(); as grace) {
							<p class="m-0 text-sm text-fg-secondary">
								{{ grace }}
							</p>
						}
						@if (controls.includesPrivateRuns) {
							<p
								class="m-0 inline-flex items-center gap-1 text-sm text-fg-secondary"
							>
								<span
									aria-hidden="true"
									class="material-icons text-base"
									>visibility</span
								>
								{{ copy().includesPrivateRuns }}
							</p>
						}
						@if (controls.includesNotes) {
							<p
								class="m-0 inline-flex items-center gap-1 text-sm text-fg-secondary"
							>
								<span
									aria-hidden="true"
									class="material-icons text-base"
									>edit_note</span
								>
								{{ copy().usesNotes }}
							</p>
						}
					</div>
					@if (controls.canRegenerate) {
						<button
							uiButton
							type="button"
							variant="secondary"
							class="tap:min-h-[44px] max-sm:!w-full shrink-0"
							[attr.aria-busy]="generation.isPending()"
							(click)="generation.open()"
						>
							<span
								aria-hidden="true"
								class="material-icons text-base"
								>refresh</span
							>
							{{
								generation.isPending()
									? copy().regenerating
									: copy().regenerate
							}}
						</button>
					}
				</div>

				@if (controls.aiRecapState === "failed") {
					<div
						class="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<p
							class="m-0 inline-flex items-center gap-1.5 text-sm text-fg"
						>
							<span
								aria-hidden="true"
								class="material-icons text-base text-warning"
								>error_outline</span
							>
							{{ copy().aiRecapFailed }}
						</p>
						<button
							uiButton
							type="button"
							variant="secondary"
							class="tap:min-h-[44px] max-sm:!w-full shrink-0"
							[disabled]="aiRecapPending()"
							(click)="addAiRecap()"
						>
							{{ copy().retry }}
						</button>
					</div>
				} @else if (controls.aiRecapState === "available") {
					<div
						*appPremiumOnly
						class="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<p class="m-0 text-sm text-fg-secondary text-pretty">
							{{ copy().addAiRecapHint }}
						</p>
						<button
							uiButton
							type="button"
							variant="premium"
							class="tap:min-h-[44px] max-sm:!w-full shrink-0"
							[disabled]="aiRecapPending()"
							(click)="addAiRecap()"
						>
							<span
								aria-hidden="true"
								class="material-icons text-base"
								>auto_awesome</span
							>
							{{ copy().addAiRecap }}
						</button>
					</div>
				}

				@if (aiRecapPending()) {
					<p
						role="status"
						class="m-0 inline-flex items-center gap-2 text-sm text-fg-secondary"
					>
						<span
							aria-hidden="true"
							class="material-icons text-base text-premium motion-safe:animate-spin"
							>autorenew</span
						>
						{{ copy().aiRecapPending }}
					</p>
				} @else if (aiRecapErrorMessage(); as message) {
					<ui-alert
						[tone]="aiRecapError() === 'exists' ? 'info' : 'danger'"
						>{{ message }}</ui-alert
					>
				}
			</section>
		}
		@if (generation.isOpen()) {
			<app-rewind-generate-dialog
				[username]="rewind().user.username"
				[year]="rewind().year"
				[rewind]="generation.latestRewind()"
				[pending]="generation.isPending()"
				[error]="generation.error()"
				(submitted)="generation.submit($event)"
				(closed)="generation.close()"
			/>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindOwnerPanel {
	readonly rewind = input.required<Rewind>();
	readonly rewindChange = output<Rewind>();

	private readonly rewindService = inject(RewindService);
	private hostDestroyed = false;

	protected readonly copy = computed(
		() => REWIND_OWNER_PANEL_COPY[this.rewind().language]
	);
	protected readonly graceLine = computed(() => {
		const graceEndsAt = this.rewind().ownerControls?.graceEndsAt;
		if (!graceEndsAt) return null;
		const copy = this.copy();
		return copy.graceUntil(formatPanelDate(graceEndsAt, copy.dateLocale));
	});
	protected readonly aiRecapPending = signal(false);
	protected readonly aiRecapError = signal<RewindAiRecapError | null>(null);
	protected readonly aiRecapErrorMessage = computed(() => {
		const error = this.aiRecapError();
		return error ? this.copy().aiRecapErrors[error] : null;
	});
	protected readonly generation = injectRewindGenerateFlow({
		username: () => this.rewind().user.username,
		year: () => this.rewind().year,
		rewind: () => this.rewind(),
		onGenerated: rewind => this.publish(rewind)
	});

	constructor() {
		inject(DestroyRef).onDestroy(() => (this.hostDestroyed = true));
	}

	protected addAiRecap() {
		if (this.aiRecapPending()) return;
		const { year, user } = this.rewind();
		this.aiRecapPending.set(true);
		this.aiRecapError.set(null);
		this.rewindService.addAiRecap(year).subscribe({
			next: rewind => {
				this.aiRecapPending.set(false);
				this.publish(rewind);
			},
			error: (failure: unknown) => {
				this.aiRecapPending.set(false);
				const kind = rewindAiRecapError(failure);
				this.aiRecapError.set(kind);
				if (AI_RECAP_ERRORS_THAT_CHANGE_THE_REWIND.includes(kind))
					this.reload(user.username, year);
			}
		});
	}

	private reload(username: string, year: number) {
		this.rewindService.getRewind(username, year).subscribe({
			next: rewind => this.publish(rewind),
			error: () => undefined
		});
	}

	private publish(rewind: Rewind) {
		if (!this.hostDestroyed) this.rewindChange.emit(rewind);
	}
}
