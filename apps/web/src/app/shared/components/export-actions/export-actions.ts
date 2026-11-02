import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type ExportParams } from "../../../core/services/export";
import { type ExportResource } from "../../../core/services/export.model";
import { ActionMenu } from "../action-menu/action-menu";
import { GiftOfferCard } from "../gift-offer-card/gift-offer-card";
import { injectExportDownload } from "./export-download";

@Component({
	selector: "app-export-actions",
	imports: [ActionMenu, GiftOfferCard],
	template: `
		<app-action-menu
			icon="download"
			label="Export"
			[heading]="'Export ' + label()"
			[items]="exporter.menuItems()"
			[busy]="exporter.isBusy()"
			(selected)="exporter.runMenuAction($event)"
		/>
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
}
