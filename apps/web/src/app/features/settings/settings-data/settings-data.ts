import { DatePipe, formatDate } from "@angular/common";
import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	LOCALE_ID,
	type OnInit,
	signal
} from "@angular/core";

import { type DataRequest, type DataRequestType } from "../../../core/models";
import { DataRequestsService } from "../../../core/services/data-requests";
import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiDialog,
	UiSkeleton
} from "../../../shared/ui";
import {
	dataRequestStatusBadge,
	dataRequestTypeDisplay,
	isDownloadable,
	isDownloadExpired
} from "../../../shared/utils/data-request-display";
import { SettingsPanel } from "../components/settings-panel";
import { SettingsRow } from "../components/settings-row";

const STALE_REQUEST_STATUSES = new Set([404, 409, 410]);

@Component({
	selector: "app-settings-data",
	imports: [
		DatePipe,
		SettingsPanel,
		SettingsRow,
		UiAlert,
		UiBadge,
		UiButton,
		UiDialog,
		UiSkeleton
	],
	templateUrl: "./settings-data.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsData implements OnInit {
	private readonly dataRequestsService = inject(DataRequestsService);
	private readonly toast = inject(ToastService);
	private readonly locale = inject(LOCALE_ID);

	protected readonly typeDisplay = dataRequestTypeDisplay;
	protected readonly statusBadge = dataRequestStatusBadge;

	protected readonly requests = signal<DataRequest[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly creatingType = signal<DataRequestType | null>(null);
	protected readonly downloadingRequestId = signal<string | null>(null);
	protected readonly confirmingDeletion = signal(false);
	private readonly loadedAt = signal(new Date());

	protected readonly pendingExport = computed(() =>
		this.pendingRequestOf("export")
	);
	protected readonly pendingDeletion = computed(() =>
		this.pendingRequestOf("deletion")
	);

	ngOnInit() {
		this.loadRequests();
	}

	protected loadRequests() {
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.dataRequestsService.list().subscribe({
			next: requests => {
				this.requests.set(requests);
				this.loadedAt.set(new Date());
				this.isLoading.set(false);
			},
			error: () => {
				this.loadFailed.set(true);
				this.isLoading.set(false);
			}
		});
	}

	protected canDownload(request: DataRequest): boolean {
		return isDownloadable(request, this.loadedAt());
	}

	protected hasDownloadExpired(request: DataRequest): boolean {
		return isDownloadExpired(request, this.loadedAt());
	}

	protected requestExport() {
		this.createRequest("export");
	}

	protected askDeletion() {
		this.confirmingDeletion.set(true);
	}

	protected cancelDeletion() {
		if (this.creatingType()) return;
		this.confirmingDeletion.set(false);
	}

	protected confirmDeletion() {
		this.createRequest("deletion");
	}

	protected download(request: DataRequest) {
		if (this.downloadingRequestId()) return;
		this.downloadingRequestId.set(request.id);
		this.dataRequestsService.download(request.id).subscribe({
			next: () => this.downloadingRequestId.set(null),
			error: (error: HttpErrorResponse) => {
				this.downloadingRequestId.set(null);
				this.notifyFailure(
					error,
					"Could not download your data. Please try again."
				);
			}
		});
	}

	private createRequest(type: DataRequestType) {
		if (this.creatingType()) return;
		this.creatingType.set(type);
		this.dataRequestsService.create(type).subscribe({
			next: request => {
				this.creatingType.set(null);
				this.confirmingDeletion.set(false);
				this.requests.update(list => [request, ...list]);
				this.toast.success(this.createdMessage(request));
			},
			error: (error: HttpErrorResponse) => {
				this.creatingType.set(null);
				this.confirmingDeletion.set(false);
				this.notifyFailure(
					error,
					"Could not send your request. Please try again."
				);
			}
		});
	}

	private createdMessage(request: DataRequest): string {
		const subject =
			request.type === "export"
				? "We'll prepare a copy of your data"
				: "We'll process the deletion of your account";
		const dueDate = formatDate(request.dueAt, "mediumDate", this.locale);
		return `Request sent. ${subject} by ${dueDate} and email you when it's done.`;
	}

	private notifyFailure(error: HttpErrorResponse, fallback: string) {
		if (!isToastedByErrorInterceptor(error.status))
			this.toast.warning(adminErrorMessage(error) ?? fallback);
		if (STALE_REQUEST_STATUSES.has(error.status)) this.loadRequests();
	}

	private pendingRequestOf(type: DataRequestType): DataRequest | null {
		return (
			this.requests().find(
				request => request.type === type && request.status === "pending"
			) ?? null
		);
	}
}
