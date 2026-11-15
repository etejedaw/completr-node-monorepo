import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiSkeleton,
	UiTable
} from "../../../shared/ui";
import { type RewindEdition } from "../services/rewind-admin.model";
import { RewindAdminService } from "../services/rewind-admin.service";
import {
	type RewindEditionDialogMode,
	type RewindEditionRow,
	type RewindEditionSaved,
	type RewindEditionStatus,
	type RewindEditionStatusStyle
} from "./admin-rewind.model";
import { AdminRewindEditionDialog } from "./admin-rewind-edition-dialog/admin-rewind-edition-dialog";
import {
	dateRangeLabel,
	REWIND_DATES_TIME_ZONE_LABEL,
	rewindEditionStatus
} from "./admin-rewind-editions";
import { AdminRewindTable } from "./admin-rewind-table/admin-rewind-table";

const STATUS_STYLES: Record<RewindEditionStatus, RewindEditionStatusStyle> = {
	scheduled: { label: "Scheduled", icon: "schedule", tone: "info" },
	open: { label: "In progress", icon: "play_circle", tone: "success" },
	closed: { label: "Closed", icon: "event_busy", tone: "warning" },
	frozen: { label: "Frozen", icon: "ac_unit", tone: "neutral" }
};

@Component({
	selector: "app-admin-rewind",
	imports: [
		AdminRewindEditionDialog,
		AdminRewindTable,
		LibraryHero,
		UiAlert,
		UiBadge,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiSkeleton,
		UiTable
	],
	templateUrl: "./admin-rewind.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRewind implements OnInit {
	private readonly rewindAdminService = inject(RewindAdminService);
	private readonly toast = inject(ToastService);
	private loadRequest?: Subscription;

	protected readonly datesTimeZoneLabel = REWIND_DATES_TIME_ZONE_LABEL;
	protected readonly editions = signal<RewindEdition[]>([]);
	protected readonly designs = signal<string[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly pageError = signal("");
	protected readonly dialog = signal<RewindEditionDialogMode | null>(null);
	protected readonly skeletonRows = [1, 2, 3];

	protected readonly rows = computed<RewindEditionRow[]>(() =>
		[...this.editions()]
			.sort((a, b) => b.year - a.year)
			.map(edition => ({ edition, status: rewindEditionStatus(edition) }))
	);
	protected readonly years = computed(() =>
		this.rows().map(row => row.edition.year)
	);
	protected readonly defaultYear = computed(
		() =>
			this.rows().find(row => row.status === "open")?.edition.year ??
			this.years()[0] ??
			null
	);

	constructor() {
		inject(DestroyRef).onDestroy(() => this.loadRequest?.unsubscribe());
	}

	ngOnInit() {
		this.load();
	}

	protected statusStyle(status: RewindEditionStatus) {
		return STATUS_STYLES[status];
	}

	protected periodLabel(edition: RewindEdition) {
		return dateRangeLabel(edition.opensAt, edition.closesAt);
	}

	protected graceLabel(edition: RewindEdition) {
		return dateRangeLabel(edition.graceStartsAt, edition.graceEndsAt);
	}

	protected refresh() {
		this.pageError.set("");
		this.load();
	}

	protected openCreate() {
		if (this.isLoading() || this.loadFailed()) return;
		this.dialog.set({ kind: "create" });
	}

	protected openEdition(edition: RewindEdition) {
		this.dialog.set({ kind: "edit", edition });
	}

	protected closeDialog() {
		this.dialog.set(null);
	}

	protected showSavedEdition({
		edition,
		affectedRewinds
	}: RewindEditionSaved) {
		const created = this.dialog()?.kind === "create";
		this.dialog.set(null);
		this.editions.update(list =>
			created
				? [...list, edition]
				: list.map(item =>
						item.year === edition.year ? edition : item
					)
		);
		const updated =
			affectedRewinds === null
				? ""
				: ` ${affectedRewinds} generated ${affectedRewinds === 1 ? "Rewind was" : "Rewinds were"} updated.`;
		this.toast.success(
			`Rewind ${edition.year} ${created ? "created" : "saved"}.${updated}`
		);
		this.load(false);
	}

	protected showEditionGone(message: string) {
		this.dialog.set(null);
		this.pageError.set(message);
		this.load(false);
	}

	private load(showSkeleton = true) {
		this.loadRequest?.unsubscribe();
		if (showSkeleton) {
			this.isLoading.set(true);
			this.loadFailed.set(false);
		}
		this.loadRequest = this.rewindAdminService.listEditions().subscribe({
			next: catalog => {
				this.editions.set(catalog.editions);
				this.designs.set(catalog.designs);
				this.loadFailed.set(false);
				this.isLoading.set(false);
			},
			error: () => {
				if (showSkeleton || this.editions().length === 0) {
					this.loadFailed.set(true);
				} else {
					this.pageError.update(
						current =>
							current ||
							"Could not refresh the editions. Showing the last loaded data."
					);
				}
				this.isLoading.set(false);
			}
		});
	}
}
