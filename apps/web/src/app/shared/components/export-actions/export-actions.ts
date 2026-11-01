import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	type OnInit,
	signal
} from "@angular/core";

import { AuthService } from "../../../core/services/auth";
import {
	type ExportFormat,
	type ExportParams,
	ExportService
} from "../../../core/services/export";
import { type ExportResource } from "../../../core/services/export.model";
import { ToastService } from "../../../core/services/toast";
import { UiButton } from "../../ui/button/ui-button";
import { UiPremiumBadge } from "../../ui/premium-badge/ui-premium-badge";
import { GiftOfferCard } from "../gift-offer-card/gift-offer-card";
import { GiftOffersService } from "../gift-offer-card/gift-offers.service";

const STATUSES_TOASTED_BY_INTERCEPTOR = new Set([402, 409, 422, 429]);

@Component({
	selector: "app-export-actions",
	imports: [UiButton, UiPremiumBadge, GiftOfferCard],
	template: `
		<button
			uiButton
			type="button"
			variant="secondary"
			size="sm"
			class="h-9"
			[disabled]="isDownloading('csv')"
			[attr.aria-busy]="isDownloading('csv') || null"
			[attr.aria-label]="downloadLabel('csv')"
			[title]="downloadLabel('csv')"
			(click)="download('csv')"
		>
			<span
				aria-hidden="true"
				class="material-icons text-base"
				[class.animate-spin]="isDownloading('csv')"
				>{{ isDownloading("csv") ? "autorenew" : "download" }}</span
			>
			CSV
		</button>
		@if (canExportJson()) {
			<button
				uiButton
				type="button"
				variant="premium"
				size="sm"
				class="h-9"
				[disabled]="isDownloading('json')"
				[attr.aria-busy]="isDownloading('json') || null"
				[attr.aria-label]="downloadLabel('json')"
				[title]="downloadLabel('json')"
				(click)="download('json')"
			>
				<span
					aria-hidden="true"
					class="material-icons text-base"
					[class.animate-spin]="isDownloading('json')"
					>{{
						isDownloading("json") ? "autorenew" : "download"
					}}</span
				>
				JSON
			</button>
			<ui-premium-badge
				size="sm"
				interactive
				label="Premium perk: JSON export"
				message="JSON export is a Premium perk. Free accounts can download their collections as CSV."
			/>
		}
		@if (!auth.isPremium()) {
			<app-gift-offer-card
				offerCode="json-export-trial-1m"
				variant="compact"
				(claimed)="jsonFeatureAccess.set(true)"
			/>
		}
	`,
	host: {
		class: "flex shrink-0 items-center gap-[8px]"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportActions implements OnInit {
	private readonly exportService = inject(ExportService);
	private readonly giftOffersService = inject(GiftOffersService);
	private readonly toast = inject(ToastService);
	protected readonly auth = inject(AuthService);

	readonly resource = input.required<ExportResource>();
	readonly label = input.required<string>();
	readonly params = input<ExportParams>({});

	private readonly downloading = signal<ReadonlySet<ExportFormat>>(new Set());
	protected readonly jsonFeatureAccess = signal(false);
	protected readonly canExportJson = computed(
		() => this.auth.isPremium() || this.jsonFeatureAccess()
	);

	ngOnInit() {
		this.giftOffersService.listOffers().subscribe({
			next: offers => {
				const offer = offers.find(
					candidate => candidate.code === "json-export-trial-1m"
				);
				this.jsonFeatureAccess.set(offer?.hasAccess ?? false);
			}
		});
	}

	protected isDownloading(format: ExportFormat): boolean {
		return this.downloading().has(format);
	}

	protected downloadLabel(format: ExportFormat): string {
		return `Download ${this.label()} as ${format.toUpperCase()}`;
	}

	protected download(format: ExportFormat) {
		if (this.isDownloading(format)) return;
		this.setDownloading(format, true);
		this.exportService
			.download(this.resource(), format, this.params())
			.subscribe({
				next: () => this.setDownloading(format, false),
				error: (error: HttpErrorResponse) => {
					this.setDownloading(format, false);
					if (!STATUSES_TOASTED_BY_INTERCEPTOR.has(error.status))
						this.toast.error(
							`Could not download ${this.label()}. Please try again.`
						);
				}
			});
	}

	private setDownloading(format: ExportFormat, active: boolean) {
		this.downloading.update(current => {
			const next = new Set(current);
			if (active) next.add(format);
			else next.delete(format);
			return next;
		});
	}
}
