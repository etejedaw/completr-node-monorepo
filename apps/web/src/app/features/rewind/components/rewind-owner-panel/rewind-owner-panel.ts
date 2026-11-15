import { NgTemplateOutlet } from "@angular/common";
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

import {
	type Rewind,
	type RewindLanguage,
	type RewindRegenerationBlock
} from "../../../../core/models/rewind.model";
import { GiftOfferCard } from "../../../../shared/components/gift-offer-card/gift-offer-card";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiEyebrow,
	UiPremiumBadge
} from "../../../../shared/ui";
import { RewindService } from "../../rewind";
import { rewindCopy } from "../../rewind-copy";
import { formatRewindDay, formatRewindDayWithYear } from "../../rewind-dates";
import {
	type RewindAiRecapError,
	rewindAiRecapError
} from "../../rewind-errors";
import { rewindPremiumAccessKindOf } from "../../rewind-premium-access-kind";
import { RewindGenerateDialog } from "../rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../rewind-generate-dialog/rewind-generate-flow";
import { REWIND_OWNER_PANEL_COPY } from "./rewind-owner-panel.copy";
import {
	type RewindOwnerAiChip,
	type RewindOwnerPanelState,
	type RewindOwnerSeasonChip
} from "./rewind-owner-panel.model";

const REGENERATION_BLOCKS_SHOWN_ELSEWHERE: readonly RewindRegenerationBlock[] =
	["period-closed", "no-regenerations-left", "no-ai-access"];

function rewindOwnerPanelState(rewind: Rewind): RewindOwnerPanelState {
	const periodStatus = rewind.ownerControls?.periodStatus ?? "closed";
	if (periodStatus !== "open") return periodStatus;
	return rewind.premiumAccess?.allowed ? "open-with-ai" : "open-without-ai";
}

const PANEL_LANGUAGE: RewindLanguage = "en";

const STATUS_CHIP_CLASS =
	"inline-flex h-9 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface/60 px-3.5 text-sm text-fg";

const AI_RECAP_ERRORS_THAT_CHANGE_THE_REWIND: readonly RewindAiRecapError[] = [
	"exists",
	"premium_required",
	"year_requires_premium",
	"period_closed",
	"limit"
];

@Component({
	selector: "app-rewind-owner-panel",
	imports: [
		GiftOfferCard,
		NgTemplateOutlet,
		UiEyebrow,
		RewindGenerateDialog,
		UiAlert,
		UiBadge,
		UiButton,
		UiPremiumBadge
	],
	templateUrl: "./rewind-owner-panel.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindOwnerPanel {
	readonly rewind = input.required<Rewind>();
	readonly rewindChange = output<Rewind>();

	private readonly rewindService = inject(RewindService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly copy = REWIND_OWNER_PANEL_COPY;
	protected readonly panelState = computed(() =>
		rewindOwnerPanelState(this.rewind())
	);
	private readonly frozenAt = computed(
		() => this.rewind().ownerControls?.frozenAt ?? this.rewind().frozenAt
	);
	protected readonly seasonChip = computed<RewindOwnerSeasonChip>(() => {
		const copy = this.copy;
		const state = this.panelState();
		if (state === "scheduled")
			return { value: copy.notOpenYet, detail: null, tone: "closed" };
		if (state === "closed") {
			const frozenAt = this.frozenAt();
			return {
				value: copy.closed,
				detail: frozenAt
					? copy.finalVersion(
							formatRewindDayWithYear(frozenAt, PANEL_LANGUAGE)
						)
					: null,
				tone: "closed"
			};
		}
		const closesAt = this.rewind().ownerControls?.closesAt;
		return {
			value: copy.seasonOpen,
			detail: closesAt
				? copy.seasonUntil(formatRewindDay(closesAt, PANEL_LANGUAGE))
				: null,
			tone: "open"
		};
	});
	protected readonly statusChipClass = STATUS_CHIP_CLASS;
	protected readonly aiPremiumLabel = computed(() => {
		const kind = rewindPremiumAccessKindOf(this.rewind().premiumAccess);
		return kind
			? rewindCopy(PANEL_LANGUAGE).premiumStats.premiumLabels[kind]
			: null;
	});
	protected readonly aiChip = computed<RewindOwnerAiChip | null>(() => {
		if (this.panelState() !== "open-with-ai") return null;
		const controls = this.rewind().ownerControls;
		const count = controls?.regenerationsLeft ?? 0;
		const graceEndsAt = controls?.graceEndsAt;
		const copy = this.copy;
		return {
			count,
			label: copy.aiGenerationsLabel(count),
			grace: graceEndsAt
				? copy.aiGraceExtra(
						formatRewindDay(graceEndsAt, PANEL_LANGUAGE)
					)
				: null
		};
	});
	protected readonly notice = computed(() => {
		const block = this.rewind().ownerControls?.regenerationBlockedBy;
		if (block && !REGENERATION_BLOCKS_SHOWN_ELSEWHERE.includes(block))
			return this.copy.regenerationBlocks[block];
		const state = this.panelState();
		if (state === "scheduled") return this.copy.scheduledHint;
		if (state === "closed" && !this.frozenAt()) return this.copy.closedHint;
		return null;
	});
	protected readonly aiRecapPending = signal(false);
	protected readonly aiRecapError = signal<RewindAiRecapError | null>(null);
	protected readonly aiRecapErrorMessage = computed(() => {
		const error = this.aiRecapError();
		return error ? this.copy.aiRecapErrors[error] : null;
	});
	protected readonly generation = injectRewindGenerateFlow({
		username: () => this.rewind().user.username,
		year: () => this.rewind().year,
		rewind: () => this.rewind(),
		onGenerated: rewind => this.publish(rewind)
	});

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

	protected reloadRewind() {
		const { year, user } = this.rewind();
		this.reload(user.username, year);
	}

	private reload(username: string, year: number) {
		this.rewindService.getRewind(username, year).subscribe({
			next: rewind => this.publish(rewind),
			error: () => undefined
		});
	}

	private publish(rewind: Rewind) {
		if (!this.destroyRef.destroyed) this.rewindChange.emit(rewind);
	}
}
