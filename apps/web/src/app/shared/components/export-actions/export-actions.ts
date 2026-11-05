import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type ExportParams } from "../../../core/services/export";
import { type ExportResource } from "../../../core/services/export.model";
import { UiPremiumBadge } from "../../ui/premium-badge/ui-premium-badge";
import { ActionMenu } from "../action-menu/action-menu";
import { GiftOfferCard } from "../gift-offer-card/gift-offer-card";
import { injectExportDownload } from "./export-download";

@Component({
	selector: "app-export-actions",
	imports: [ActionMenu, GiftOfferCard, UiPremiumBadge],
	template: `
		<app-action-menu
			icon="download"
			label="Export"
			[heading]="'Export ' + label()"
			[items]="menuItems()"
			[busy]="exporter.isBusy()"
			[premium]="exporter.canExportJson()"
			(selected)="exporter.runMenuAction($event)"
		/>
		@if (exporter.canExportJson()) {
			<ui-premium-badge
				size="sm"
				interactive
				label="Premium perk: JSON export"
				message="Download your full data as JSON, ready for backups."
			/>
		}
		@if (!exporter.isPremium()) {
			<app-gift-offer-card
				feature="export.json"
				variant="compact"
				class="block min-w-0 max-w-full empty:hidden"
				(claimed)="exporter.jsonGiftClaimed.set(true)"
				(expired)="exporter.jsonGiftClaimed.set(false)"
			/>
		}
	`,
	host: {
		class: "flex min-w-0 max-w-full flex-wrap items-center gap-[8px] sm:shrink-0"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportActions {
	readonly resource = input.required<ExportResource>();
	readonly label = input.required<string>();
	readonly params = input<ExportParams>({});

	protected readonly exporter = injectExportDownload({
		resource: this.resource,
		label: this.label,
		params: this.params
	});

	protected readonly menuItems = computed(() =>
		this.exporter
			.menuItems()
			.map(item => ({ ...item, hidePremiumBadge: true }))
	);
}
