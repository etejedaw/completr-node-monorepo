import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	computed,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	OptionPicker,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import {
	UiButton,
	UiEmptyState,
	UiNoMatches,
	UiPagination,
	UiSkeleton
} from "../../../shared/ui";
import { type AuditLogEntry, AuditService } from "../services/audit.service";

const ACTION_OPTIONS = [
	"user_created",
	"user_edited",
	"user_invited",
	"invitation_revoked",
	"game_created",
	"game_edited",
	"game_deleted",
	"game_deactivated",
	"job_started",
	"report_approved",
	"report_rejected"
];

const TARGET_TYPE_OPTIONS = ["game", "user", "invitation", "report", "job"];

const toPickerOptions = (
	values: string[],
	allLabel: string
): PickerOption[] => [
	{ value: "", label: allLabel },
	...values.map(value => ({ value, label: value }))
];

@Component({
	selector: "app-admin-audit",
	imports: [
		DatePipe,
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		OptionPicker,
		UiButton,
		UiEmptyState,
		UiNoMatches,
		UiPagination,
		UiSkeleton
	],
	templateUrl: "./admin-audit.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAudit implements OnInit {
	private readonly auditService = inject(AuditService);

	protected readonly logs = signal<AuditLogEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly limit = 50;
	protected readonly actionFilter = signal<string>("");
	protected readonly targetTypeFilter = signal<string>("");
	protected readonly actionOptions = toPickerOptions(
		ACTION_OPTIONS,
		"All actions"
	);
	protected readonly targetTypeOptions = toPickerOptions(
		TARGET_TYPE_OPTIONS,
		"All targets"
	);
	protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];
	protected readonly hasFilters = computed(
		() => !!this.actionFilter() || !!this.targetTypeFilter()
	);

	ngOnInit() {
		this.loadLogs();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadLogs();
	}

	setActionFilter(action: string) {
		this.actionFilter.set(action);
		this.offset.set(0);
		this.loadLogs();
	}

	setTargetTypeFilter(targetType: string) {
		this.targetTypeFilter.set(targetType);
		this.offset.set(0);
		this.loadLogs();
	}

	clearFilters() {
		this.actionFilter.set("");
		this.targetTypeFilter.set("");
		this.offset.set(0);
		this.loadLogs();
	}

	reload() {
		this.loadLogs();
	}

	private loadLogs() {
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.auditService
			.getAuditLog(this.limit, this.offset(), {
				action: this.actionFilter() || undefined,
				targetType: this.targetTypeFilter() || undefined
			})
			.subscribe({
				next: res => {
					this.logs.set(res.logs);
					this.total.set(res.total);
					this.isLoading.set(false);
				},
				error: () => {
					this.loadFailed.set(true);
					this.isLoading.set(false);
				}
			});
	}
}
