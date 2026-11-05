import { DatePipe } from "@angular/common";
import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiEyebrow,
	UiPagination,
	UiSkeleton
} from "../../../shared/ui";
import {
	dataRequestStatusBadge,
	dataRequestTypeDisplay,
	daysRemainingBadge
} from "../../../shared/utils/data-request-display";
import { AdminAccountDeletionDialog } from "../admin-account-deletion-dialog/admin-account-deletion-dialog";
import { AdminDataRequestRejectDialog } from "../admin-data-request-reject-dialog/admin-data-request-reject-dialog";
import { type AdminDataRequest } from "../services/data-request-admin.model";
import { DataRequestAdminService } from "../services/data-request-admin.service";
import { type DataRequestStatusFilter } from "./admin-data-requests.model";

const PAGE_SIZE = 20;

const STATUS_FILTER_OPTIONS: readonly SegmentedOption<DataRequestStatusFilter>[] =
	[
		{ value: "pending", label: "Pending" },
		{ value: "completed", label: "Completed" },
		{ value: "rejected", label: "Rejected" },
		{ value: "all", label: "All" }
	];

@Component({
	selector: "app-admin-data-requests",
	imports: [
		AdminAccountDeletionDialog,
		AdminDataRequestRejectDialog,
		DatePipe,
		RouterLink,
		SegmentedControl,
		UiAlert,
		UiBadge,
		UiButton,
		UiEyebrow,
		UiPagination,
		UiSkeleton
	],
	templateUrl: "./admin-data-requests.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDataRequests implements OnInit {
	private readonly dataRequestAdminService = inject(DataRequestAdminService);
	private readonly toast = inject(ToastService);
	private listSubscription: Subscription | null = null;

	readonly accountDeleted = output<void>();

	protected readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
	protected readonly typeDisplay = dataRequestTypeDisplay;
	protected readonly statusBadge = dataRequestStatusBadge;
	protected readonly daysRemainingBadge = daysRemainingBadge;
	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRows = [1, 2, 3];

	protected readonly statusFilter = signal<DataRequestStatusFilter>("pending");
	protected readonly requests = signal<AdminDataRequest[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly busyRequestId = signal<string | null>(null);
	protected readonly deletionToConfirm = signal<AdminDataRequest | null>(null);
	protected readonly requestToReject = signal<AdminDataRequest | null>(null);

	constructor() {
		inject(DestroyRef).onDestroy(() =>
			this.listSubscription?.unsubscribe()
		);
	}

	ngOnInit() {
		this.reload();
	}

	reload() {
		this.listSubscription?.unsubscribe();
		this.isLoading.set(true);
		this.loadFailed.set(false);
		const status = this.statusFilter();
		this.listSubscription = this.dataRequestAdminService
			.list({
				status: status === "all" ? undefined : status,
				limit: PAGE_SIZE,
				offset: this.offset()
			})
			.subscribe({
				next: page => {
					this.requests.set(page.requests);
					this.total.set(page.total);
					this.isLoading.set(false);
				},
				error: () => {
					this.loadFailed.set(true);
					this.isLoading.set(false);
				}
			});
	}

	protected setStatusFilter(status: DataRequestStatusFilter) {
		if (status === this.statusFilter()) return;
		this.statusFilter.set(status);
		this.offset.set(0);
		this.reload();
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.reload();
	}

	protected ownerName(request: AdminDataRequest): string {
		return request.user?.username ?? "Deleted account";
	}

	protected complete(request: AdminDataRequest) {
		if (request.type === "deletion" && request.user) {
			this.deletionToConfirm.set(request);
			return;
		}
		this.runCompletion(request);
	}

	protected confirmDeletion() {
		const request = this.deletionToConfirm();
		if (request) this.runCompletion(request);
	}

	protected cancelDeletion() {
		if (this.busyRequestId()) return;
		this.deletionToConfirm.set(null);
	}

	protected askRejection(request: AdminDataRequest) {
		this.requestToReject.set(request);
	}

	protected cancelRejection() {
		if (this.busyRequestId()) return;
		this.requestToReject.set(null);
	}

	protected reject(reason: string) {
		const request = this.requestToReject();
		if (!request || this.busyRequestId()) return;
		this.busyRequestId.set(request.id);
		this.dataRequestAdminService.reject(request.id, reason).subscribe({
			next: () => {
				this.finishAction();
				this.toast.success(
					`Request from ${this.ownerName(request)} rejected. They were emailed the reason.`
				);
			},
			error: (error: HttpErrorResponse) =>
				this.failAction(error, "Could not reject the request.")
		});
	}

	private runCompletion(request: AdminDataRequest) {
		if (this.busyRequestId()) return;
		this.busyRequestId.set(request.id);
		this.dataRequestAdminService.complete(request.id).subscribe({
			next: () => {
				this.finishAction();
				this.toast.success(this.completionMessage(request));
				if (request.type === "deletion") this.accountDeleted.emit();
			},
			error: (error: HttpErrorResponse) =>
				this.failAction(error, "Could not complete the request.")
		});
	}

	private completionMessage(request: AdminDataRequest): string {
		const owner = this.ownerName(request);
		return request.type === "deletion"
			? `Account ${owner} deleted. The request is completed.`
			: `Copy of data for ${owner} is ready to download. They were emailed.`;
	}

	private finishAction() {
		this.busyRequestId.set(null);
		this.deletionToConfirm.set(null);
		this.requestToReject.set(null);
		this.reload();
	}

	private failAction(error: HttpErrorResponse, fallback: string) {
		this.busyRequestId.set(null);
		if (!isToastedByErrorInterceptor(error.status))
			this.toast.error(adminErrorMessage(error) ?? fallback);
		if (error.status === 409 || error.status === 404) this.finishAction();
	}
}
