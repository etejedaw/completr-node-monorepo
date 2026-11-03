import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { form, FormField, required } from "@angular/forms/signals";
import { forkJoin } from "rxjs";

import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../shared/components/option-picker/option-picker.model";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiInput,
	UiLabel,
	UiPlainEmptyState,
	UiSkeleton
} from "../../../shared/ui";
import {
	type PremiumFeatureDefinition,
	type PremiumGrant,
	type PremiumGrantFeature
} from "../services/premium-access-admin.model";
import { PremiumAccessAdminService } from "../services/premium-access-admin.service";
import { type AdminUser } from "../services/user-admin.model";

function toLocalInput(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
	return value ? new Date(value).toISOString() : null;
}

const FEATURE_LABELS: Partial<Record<PremiumGrantFeature, string>> = {
	"lists.unlimited": "Unlimited lists",
	"saved-filters.unlimited": "Unlimited saved filters",
	"favorites.unlimited": "Unlimited favorites",
	"wishlist.unlimited": "Unlimited wishlist",
	"queue.unlimited": "Unlimited queue",
	"game-shelf.unlimited": "Unlimited game shelf",
	"mood-tags.unlimited": "Unlimited mood tags",
	"activity.feed-filters": "Activity feed filters",
	"themes.premium": "Premium themes",
	"export.json": "JSON export",
	"rewind.premium": "Premium Rewind"
};

@Component({
	selector: "app-admin-premium-access",
	imports: [
		DatePipe,
		FormField,
		OptionPicker,
		UiAlert,
		UiBadge,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiFieldOptional,
		UiFormField,
		UiInput,
		UiLabel,
		UiPlainEmptyState,
		UiSkeleton
	],
	templateUrl: "./admin-premium-access.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPremiumAccess implements OnInit {
	readonly user = input.required<Pick<AdminUser, "id" | "username">>();
	readonly closed = output<void>();

	private readonly premiumAccessService = inject(PremiumAccessAdminService);
	private readonly destroyRef = inject(DestroyRef);
	private destroyed = false;
	private loadGeneration = 0;
	private mutationGeneration = 0;

	protected readonly isLoading = signal(true);
	protected readonly loadError = signal("");
	protected readonly mutationError = signal("");
	protected readonly successMessage = signal("");
	protected readonly busy = signal("");
	protected readonly pendingFullRevoke = signal("");
	protected readonly extendError = signal<{
		grantId: string;
		message: string;
	} | null>(null);
	protected readonly grants = signal<PremiumGrant[]>([]);
	protected readonly features = signal<PremiumFeatureDefinition[]>([]);
	protected readonly fullGrants = computed(() =>
		this.grants().filter(grant => grant.feature === "*")
	);
	protected readonly individualGrants = computed(() =>
		this.grants().filter(grant => grant.feature !== "*")
	);
	protected readonly featureOptions = computed<PickerOption[]>(() =>
		this.features().map(definition => ({
			value: definition.feature,
			label: this.featureLabel(definition.feature),
			icon: "workspace_premium",
			iconClass: "text-premium",
			hint: definition.feature
		}))
	);
	protected readonly minimumExpiration = toLocalInput(new Date());
	protected readonly fullModel = signal({
		expiresAt: toLocalInput(new Date(Date.now() + 30 * 86_400_000))
	});
	protected readonly featureModel = signal({
		feature: "lists.unlimited" as PremiumGrantFeature,
		expiresAt: ""
	});
	protected readonly fullForm = form(this.fullModel, path => {
		required(path.expiresAt, {
			message: "Full premium requires an expiration date."
		});
	});
	protected readonly featureForm = form(this.featureModel, path => {
		required(path.feature, { message: "Choose a feature." });
	});

	constructor() {
		this.destroyRef.onDestroy(() => {
			this.destroyed = true;
			this.loadGeneration += 1;
			this.mutationGeneration += 1;
		});
	}

	ngOnInit() {
		this.load();
	}

	protected load() {
		const generation = ++this.loadGeneration;
		this.isLoading.set(true);
		this.loadError.set("");
		forkJoin({
			grants: this.premiumAccessService.listGrants(this.user().id),
			features: this.premiumAccessService.listFeatures()
		}).subscribe({
			next: ({ grants, features }) => {
				if (!this.isCurrentLoad(generation)) return;
				this.grants.set(grants);
				this.features.set(features);
				this.isLoading.set(false);
			},
			error: () => {
				if (!this.isCurrentLoad(generation)) return;
				this.loadError.set("Could not load premium access.");
				this.isLoading.set(false);
			}
		});
	}

	protected createFull(event: Event) {
		event.preventDefault();
		if (this.busy()) return;
		if (this.fullForm().invalid()) {
			this.fullForm().markAsTouched();
			this.clearFeedback();
			return;
		}
		this.create({
			feature: "*",
			expiresAt: toIso(this.fullModel().expiresAt)
		});
	}

	protected createFeature(event: Event) {
		event.preventDefault();
		if (this.busy()) return;
		if (this.featureForm().invalid()) {
			this.featureForm().markAsTouched();
			this.clearFeedback();
			return;
		}
		this.create({
			feature: this.featureModel().feature,
			expiresAt: toIso(this.featureModel().expiresAt)
		});
	}

	protected extend(grant: PremiumGrant, value: string) {
		if (this.busy()) return;
		if (grant.feature === "*" && !value) {
			this.clearFeedback();
			this.extendError.set({
				grantId: grant.id,
				message: "Full premium requires an expiration date."
			});
			return;
		}
		const generation = this.startMutation(grant.id);
		this.premiumAccessService
			.updateGrant(this.user().id, grant.id, toIso(value))
			.subscribe({
				next: updated => {
					if (!this.isCurrentMutation(generation)) return;
					this.replaceGrant(updated);
					this.busy.set("");
					this.successMessage.set("Expiration updated.");
				},
				error: error =>
					this.mutationFailed(
						generation,
						error,
						"Could not update the grant."
					)
			});
	}

	protected requestRevoke(grant: PremiumGrant) {
		if (this.busy()) return;
		if (grant.feature === "*" && this.pendingFullRevoke() !== grant.id) {
			this.clearFeedback();
			this.pendingFullRevoke.set(grant.id);
			return;
		}
		const generation = this.startMutation(grant.id);
		this.premiumAccessService
			.revokeGrant(this.user().id, grant.id)
			.subscribe({
				next: updated => {
					if (!this.isCurrentMutation(generation)) return;
					this.replaceGrant(updated);
					this.busy.set("");
					this.successMessage.set("Premium access revoked.");
				},
				error: error =>
					this.mutationFailed(
						generation,
						error,
						"Could not revoke the grant."
					)
			});
	}

	protected setFeature(feature: string) {
		this.featureForm.feature().value.set(feature as PremiumGrantFeature);
	}

	protected cancelRevoke() {
		this.pendingFullRevoke.set("");
	}

	protected featureLabel(feature: PremiumGrantFeature) {
		return feature === "*"
			? "Full premium"
			: (FEATURE_LABELS[feature] ?? feature);
	}

	protected isActive(grant: PremiumGrant) {
		return (
			grant.expiresAt === null || new Date(grant.expiresAt) > new Date()
		);
	}

	protected toLocalInput(value: string | null) {
		return value ? toLocalInput(value) : "";
	}

	private create(data: {
		feature: PremiumGrantFeature;
		expiresAt: string | null;
	}) {
		const generation = this.startMutation("create");
		this.premiumAccessService.createGrant(this.user().id, data).subscribe({
			next: grant => {
				if (!this.isCurrentMutation(generation)) return;
				this.grants.update(grants => [grant, ...grants]);
				this.busy.set("");
				this.successMessage.set("Premium access granted.");
			},
			error: error =>
				this.mutationFailed(
					generation,
					error,
					"Could not create the grant."
				)
		});
	}

	private startMutation(key: string) {
		this.busy.set(key);
		this.pendingFullRevoke.set("");
		this.clearFeedback();
		return ++this.mutationGeneration;
	}

	private isCurrentLoad(generation: number) {
		return !this.destroyed && generation === this.loadGeneration;
	}

	private isCurrentMutation(generation: number) {
		return !this.destroyed && generation === this.mutationGeneration;
	}

	private replaceGrant(updated: PremiumGrant) {
		this.grants.update(grants =>
			grants.map(grant => (grant.id === updated.id ? updated : grant))
		);
	}

	private clearFeedback() {
		this.mutationError.set("");
		this.successMessage.set("");
		this.extendError.set(null);
	}

	private mutationFailed(
		generation: number,
		error: { error?: { title?: string } },
		fallback: string
	) {
		if (!this.isCurrentMutation(generation)) return;
		this.mutationError.set(error.error?.title ?? fallback);
		this.busy.set("");
	}
}
