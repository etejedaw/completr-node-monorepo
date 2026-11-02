import { type HttpErrorResponse } from "@angular/common/http";
import { computed, inject, signal } from "@angular/core";

import { AuthService } from "../../../core/services/auth";
import {
	type ExportFormat,
	type ExportParams,
	ExportService
} from "../../../core/services/export";
import { type ExportResource } from "../../../core/services/export.model";
import { ToastService } from "../../../core/services/toast";
import { type ActionMenuItem } from "../action-menu/action-menu.model";

const STATUSES_TOASTED_BY_INTERCEPTOR = new Set([402, 409, 422, 429]);

export const EXPORT_ACTION_PREFIX = "export:";

interface ExportSource {
	resource: () => ExportResource;
	label: () => string;
	params?: () => ExportParams;
}

export function injectExportDownload(source: ExportSource) {
	const exportService = inject(ExportService);
	const toast = inject(ToastService);
	const auth = inject(AuthService);

	const downloading = signal<ReadonlySet<ExportFormat>>(new Set());
	const jsonGiftClaimed = signal(false);
	const canExportJson = computed(
		() => auth.hasPremiumFeature("export.json") || jsonGiftClaimed()
	);
	const isBusy = computed(() => downloading().size > 0);

	const menuItems = computed<ActionMenuItem[]>(() => [
		{
			id: `${EXPORT_ACTION_PREFIX}csv`,
			label: "Download CSV",
			icon: "table_view",
			hint: "Opens in any spreadsheet",
			busy: downloading().has("csv")
		},
		{
			id: `${EXPORT_ACTION_PREFIX}json`,
			label: "Download JSON",
			icon: "data_object",
			hint: canExportJson() ? "Full data, for backups" : "Premium perk",
			premium: true,
			locked: !canExportJson(),
			busy: downloading().has("json")
		}
	]);

	function setDownloading(format: ExportFormat, active: boolean) {
		downloading.update(current => {
			const next = new Set(current);
			if (active) next.add(format);
			else next.delete(format);
			return next;
		});
	}

	function download(format: ExportFormat) {
		if (downloading().has(format)) return;
		setDownloading(format, true);
		exportService
			.download(source.resource(), format, source.params?.() ?? {})
			.subscribe({
				next: () => setDownloading(format, false),
				error: (error: HttpErrorResponse) => {
					setDownloading(format, false);
					if (!STATUSES_TOASTED_BY_INTERCEPTOR.has(error.status))
						toast.error(
							`Could not download ${source.label()}. Please try again.`
						);
				}
			});
	}

	function runMenuAction(id: string): boolean {
		if (!id.startsWith(EXPORT_ACTION_PREFIX)) return false;
		download(id.slice(EXPORT_ACTION_PREFIX.length) as ExportFormat);
		return true;
	}

	return {
		isPremium: auth.isPremium,
		isBusy,
		menuItems,
		jsonGiftClaimed,
		runMenuAction
	};
}
