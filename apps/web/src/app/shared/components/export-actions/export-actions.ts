import { type HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	signal
} from "@angular/core";

import {
	type ExportFormat,
	type ExportResource,
	ExportService
} from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { PremiumOnly } from "../../directives/premium-only";
import { UiButton } from "../../ui/button/ui-button";

const STATUSES_TOASTED_BY_INTERCEPTOR = new Set([402, 409, 422, 429]);

@Component({
	selector: "app-export-actions",
	imports: [UiButton, PremiumOnly],
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
		<button
			*appPremiumOnly
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
				>{{ isDownloading("json") ? "autorenew" : "download" }}</span
			>
			JSON
		</button>
	`,
	host: {
		class: "flex shrink-0 items-center gap-[8px]"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportActions {
	private readonly exportService = inject(ExportService);
	private readonly toast = inject(ToastService);

	readonly resource = input.required<ExportResource>();
	readonly label = input.required<string>();

	private readonly downloading = signal<ReadonlySet<ExportFormat>>(new Set());

	protected isDownloading(format: ExportFormat): boolean {
		return this.downloading().has(format);
	}

	protected downloadLabel(format: ExportFormat): string {
		return `Download ${this.label()} as ${format.toUpperCase()}`;
	}

	protected download(format: ExportFormat) {
		if (this.isDownloading(format)) return;
		this.setDownloading(format, true);
		this.exportService.download(this.resource(), format).subscribe({
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
