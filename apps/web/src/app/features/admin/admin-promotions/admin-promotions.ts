import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { form, FormField, required, validate } from "@angular/forms/signals";
import { type Observable, type Subscription } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../shared/components/option-picker/option-picker.model";
import {
	UiAlert,
	UiBadge,
	type UiBadgeTone,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiEyebrow,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel,
	UiSkeleton,
	UiTable
} from "../../../shared/ui";
import { validationSummary } from "../../../shared/utils/validation-errors";
import { type PremiumGrantFeature } from "../services/premium-access-admin.model";
import {
	PREMIUM_PROMOTION_FEATURE_OPTIONS,
	type PremiumPromotion,
	type PremiumPromotionStatus,
	premiumPromotionStatus,
	type UpdatePremiumPromotionRequest
} from "../services/premium-promotions-admin.model";
import { PremiumPromotionsAdminService } from "../services/premium-promotions-admin.service";

interface PromotionStatusStyle {
	label: string;
	icon: string;
	tone: UiBadgeTone;
}

interface PromotionRow {
	promotion: PremiumPromotion;
	status: PremiumPromotionStatus;
	menuItems: ActionMenuItem[];
}

type PromotionDialog =
	{ kind: "create" } | { kind: "edit"; promotion: PremiumPromotion };

interface PromotionHttpError {
	status?: number;
	error?: { type?: string; title?: string };
}

const STATUS_STYLES: Record<PremiumPromotionStatus, PromotionStatusStyle> = {
	scheduled: {
		label: "Scheduled",
		icon: "schedule",
		tone: "info"
	},
	active: {
		label: "Active",
		icon: "check_circle",
		tone: "success"
	},
	ended: {
		label: "Ended",
		icon: "event_busy",
		tone: "neutral"
	}
};

const CODE_MIN_LENGTH = 3;
const CODE_MAX_LENGTH = 80;
// Lowercase kebab-case such as rewind-launch-2026.
const PROMOTION_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUS_REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_DURATION_DAYS = 30;
const DAY_MS = 86_400_000;

function toLocalInput(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function parseLocalInput(value: string) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function emptyCreateModel() {
	const now = new Date();
	return {
		feature: "" as PremiumGrantFeature | "",
		code: "",
		startsAt: toLocalInput(now),
		endsAt: toLocalInput(
			new Date(now.getTime() + DEFAULT_DURATION_DAYS * DAY_MS)
		)
	};
}

function endsAtError(startsAt: string, endsAt: string) {
	const end = parseLocalInput(endsAt);
	if (!end) return "Choose a valid end date.";
	const start = parseLocalInput(startsAt);
	if (start && end <= start) return "The end must be after the start.";
	if (end <= new Date()) return "The end must be in the future.";
	return null;
}

@Component({
	selector: "app-admin-promotions",
	imports: [
		ActionMenu,
		DatePipe,
		FormField,
		LibraryHero,
		OptionPicker,
		UiAlert,
		UiBadge,
		UiButton,
		UiDialog,
		UiEyebrow,
		UiEmptyState,
		UiFieldLabel,
		UiFormField,
		UiInput,
		UiLabel,
		UiSkeleton,
		UiTable
	],
	templateUrl: "./admin-promotions.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPromotions implements OnInit {
	private readonly promotionsService = inject(PremiumPromotionsAdminService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);
	private loadRequest?: Subscription;

	protected readonly promotions = signal<PremiumPromotion[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly pageError = signal("");
	protected readonly busyKey = signal("");
	protected readonly dialog = signal<PromotionDialog | null>(null);
	protected readonly dialogError = signal("");
	protected readonly revokeTarget = signal<PremiumPromotion | null>(null);
	protected readonly now = signal(new Date());
	protected readonly isBusy = computed(() => this.busyKey() !== "");
	protected readonly skeletonRows = [1, 2, 3, 4];
	protected readonly featureOptions = PREMIUM_PROMOTION_FEATURE_OPTIONS;
	protected readonly featurePickerOptions: PickerOption[] =
		PREMIUM_PROMOTION_FEATURE_OPTIONS.map(option => ({
			value: option.feature,
			label: option.label
		}));

	protected readonly rows = computed<PromotionRow[]>(() => {
		const now = this.now();
		const busy = this.isBusy();
		return this.promotions().map(promotion => ({
			promotion,
			status: premiumPromotionStatus(promotion, now),
			menuItems: [
				{
					id: "edit",
					label: "Edit dates",
					icon: "edit",
					disabled: busy
				},
				{
					id: "revoke",
					label: "End early",
					icon: "event_busy",
					iconClass: "text-danger",
					disabled: busy,
					busy: this.busyKey() === `revoke:${promotion.id}`
				}
			]
		}));
	});

	protected readonly createModel = signal(emptyCreateModel());
	protected readonly createForm = form(this.createModel, path => {
		required(path.feature, { message: "Choose a feature." });
		validate(path.code, ({ value }) => {
			const code = value().trim();
			if (!code)
				return { kind: "required", message: "Code is required." };
			if (code.length < CODE_MIN_LENGTH)
				return {
					kind: "minLength",
					message: `Use at least ${CODE_MIN_LENGTH} characters.`
				};
			if (code.length > CODE_MAX_LENGTH)
				return {
					kind: "maxLength",
					message: `Use at most ${CODE_MAX_LENGTH} characters.`
				};
			if (!PROMOTION_CODE_PATTERN.test(code))
				return {
					kind: "pattern",
					message:
						"Use lowercase letters, numbers and single hyphens, like rewind-launch-2026."
				};
			return null;
		});
		validate(path.startsAt, ({ value }) =>
			parseLocalInput(value())
				? null
				: { kind: "required", message: "Choose a valid start date." }
		);
		validate(path.endsAt, ({ value, valueOf }) => {
			const message = endsAtError(valueOf(path.startsAt), value());
			return message ? { kind: "endsAt", message } : null;
		});
	});

	protected readonly editModel = signal({ startsAt: "", endsAt: "" });
	protected readonly editForm = form(this.editModel, path => {
		validate(path.startsAt, ({ value }) =>
			parseLocalInput(value())
				? null
				: { kind: "required", message: "Choose a valid start date." }
		);
		validate(path.endsAt, ({ value, valueOf }) => {
			const message = endsAtError(valueOf(path.startsAt), value());
			return message ? { kind: "endsAt", message } : null;
		});
	});

	constructor() {
		const timer = setInterval(
			() => this.now.set(new Date()),
			STATUS_REFRESH_INTERVAL_MS
		);
		this.destroyRef.onDestroy(() => {
			clearInterval(timer);
			this.loadRequest?.unsubscribe();
		});
	}

	ngOnInit() {
		this.loadPromotions();
	}

	protected refresh() {
		this.pageError.set("");
		this.loadPromotions();
	}

	protected featureLabel(feature: PremiumGrantFeature) {
		return (
			this.featureOptions.find(option => option.feature === feature)
				?.label ?? feature
		);
	}

	protected readonly showFeatureError = computed(() => {
		const feature = this.createForm.feature();
		return feature.touched() && feature.invalid();
	});

	protected setFeature(value: string) {
		const feature = this.createForm.feature();
		feature.value.set(value as PremiumGrantFeature);
		feature.markAsTouched();
	}

	protected runRowAction(promotion: PremiumPromotion, action: string) {
		if (action === "edit") this.openEdit(promotion);
		if (action === "revoke") this.openRevoke(promotion);
	}

	protected statusStyle(status: PremiumPromotionStatus) {
		return STATUS_STYLES[status];
	}

	protected openCreate() {
		if (this.isBusy()) return;
		this.createModel.set(emptyCreateModel());
		this.createForm().reset();
		this.dialogError.set("");
		this.dialog.set({ kind: "create" });
	}

	protected openEdit(promotion: PremiumPromotion) {
		if (this.isBusy()) return;
		if (premiumPromotionStatus(promotion) === "ended") return;
		this.editModel.set({
			startsAt: toLocalInput(promotion.startsAt),
			endsAt: toLocalInput(promotion.endsAt)
		});
		this.editForm().reset();
		this.dialogError.set("");
		this.dialog.set({ kind: "edit", promotion });
	}

	protected closeDialog() {
		if (this.isBusy()) return;
		this.dialog.set(null);
		this.dialogError.set("");
	}

	protected openRevoke(promotion: PremiumPromotion) {
		if (this.isBusy()) return;
		if (premiumPromotionStatus(promotion) === "ended") return;
		this.pageError.set("");
		this.revokeTarget.set(promotion);
	}

	protected closeRevoke() {
		if (this.isBusy()) return;
		this.revokeTarget.set(null);
	}

	protected submitCreate(event: Event) {
		event.preventDefault();
		if (this.isBusy()) return;
		if (this.createForm().invalid()) {
			this.createForm().markAsTouched();
			return;
		}
		const value = this.createModel();
		const startsAt = parseLocalInput(value.startsAt);
		const endsAt = parseLocalInput(value.endsAt);
		if (!startsAt || !endsAt) return;
		if (!value.feature) return;
		const code = value.code.trim();
		this.dialogError.set("");
		this.mutate(
			"create",
			this.promotionsService.create({
				code,
				feature: value.feature,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString()
			}),
			created => {
				this.promotions.update(list => [created, ...list]);
				this.dialog.set(null);
				this.toast.success(`Promotion ${created.code} created.`);
			},
			error =>
				this.handleDialogError(error, "Could not create the promotion.")
		);
	}

	protected submitEdit(event: Event) {
		event.preventDefault();
		if (this.isBusy()) return;
		const current = this.dialog();
		if (current?.kind !== "edit") return;
		if (this.editForm().invalid()) {
			this.editForm().markAsTouched();
			return;
		}
		const changes = this.changedDates(current.promotion);
		if (!changes) {
			this.dialogError.set("Change at least one date before saving.");
			return;
		}
		this.dialogError.set("");
		this.mutate(
			`edit:${current.promotion.id}`,
			this.promotionsService.update(current.promotion.id, changes),
			updated => {
				this.replacePromotion(updated);
				this.dialog.set(null);
				this.toast.success(`Promotion ${updated.code} updated.`);
			},
			error =>
				this.handleDialogError(error, "Could not update the promotion.")
		);
	}

	protected confirmRevoke() {
		if (this.isBusy()) return;
		const target = this.revokeTarget();
		if (!target) return;
		this.mutate(
			`revoke:${target.id}`,
			this.promotionsService.revoke(target.id),
			revoked => {
				this.replacePromotion(revoked);
				this.revokeTarget.set(null);
				this.toast.success(`Promotion ${revoked.code} ended.`);
			},
			error => {
				this.revokeTarget.set(null);
				this.handlePageError(error, "Could not end the promotion.");
			}
		);
	}

	private changedDates(promotion: PremiumPromotion) {
		const model = this.editModel();
		const startsAt = parseLocalInput(model.startsAt);
		const endsAt = parseLocalInput(model.endsAt);
		if (!startsAt || !endsAt) return null;
		const changes: UpdatePremiumPromotionRequest = {};
		if (model.startsAt !== toLocalInput(promotion.startsAt))
			changes.startsAt = startsAt.toISOString();
		if (model.endsAt !== toLocalInput(promotion.endsAt))
			changes.endsAt = endsAt.toISOString();
		return Object.keys(changes).length > 0 ? changes : null;
	}

	private mutate<T>(
		key: string,
		request: Observable<T>,
		onSuccess: (result: T) => void,
		onError: (error: PromotionHttpError) => void
	) {
		this.busyKey.set(key);
		request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: result => {
				this.busyKey.set("");
				this.now.set(new Date());
				onSuccess(result);
				this.loadPromotions(false);
			},
			error: (error: PromotionHttpError) => {
				this.busyKey.set("");
				onError(error);
			}
		});
	}

	private handleDialogError(error: PromotionHttpError, fallback: string) {
		const type = error.error?.type;
		if (type === "PREMIUM_PROMOTION_ENDED") {
			this.dialog.set(null);
			this.pageError.set(
				"That promotion has already ended, so it can no longer be edited."
			);
			this.loadPromotions(false);
			return;
		}
		if (type === "PREMIUM_PROMOTION_NOT_FOUND") {
			this.dialog.set(null);
			this.pageError.set("That promotion no longer exists.");
			this.loadPromotions(false);
			return;
		}
		if (type === "PREMIUM_PROMOTION_CODE_CONFLICT") {
			this.dialogError.set(
				"That code is already used by another promotion or reserved by a gift offer. Choose a different one."
			);
			return;
		}
		this.dialogError.set(
			validationSummary(error) ?? error.error?.title ?? fallback
		);
	}

	private handlePageError(error: PromotionHttpError, fallback: string) {
		const type = error.error?.type;
		if (type === "PREMIUM_PROMOTION_ENDED") {
			this.pageError.set("That promotion has already ended.");
		} else if (type === "PREMIUM_PROMOTION_NOT_FOUND") {
			this.pageError.set("That promotion no longer exists.");
		} else {
			this.pageError.set(error.error?.title ?? fallback);
		}
		this.loadPromotions(false);
	}

	private replacePromotion(updated: PremiumPromotion) {
		this.promotions.update(list =>
			list.map(item => (item.id === updated.id ? updated : item))
		);
	}

	private loadPromotions(showSkeleton = true) {
		this.loadRequest?.unsubscribe();
		if (showSkeleton) {
			this.isLoading.set(true);
			this.loadFailed.set(false);
		}
		this.loadRequest = this.promotionsService.list().subscribe({
			next: promotions => {
				this.promotions.set(promotions);
				this.now.set(new Date());
				this.loadFailed.set(false);
				this.isLoading.set(false);
			},
			error: () => {
				if (showSkeleton || this.promotions().length === 0) {
					this.loadFailed.set(true);
				} else {
					this.pageError.update(
						current =>
							current ||
							"Could not refresh the list. Showing the last loaded data."
					);
				}
				this.isLoading.set(false);
			}
		});
	}
}
