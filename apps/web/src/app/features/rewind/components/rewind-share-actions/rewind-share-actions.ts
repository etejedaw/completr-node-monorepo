import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DOCUMENT,
	effect,
	inject,
	input,
	signal
} from "@angular/core";

import { ExportService } from "../../../../core/services/export";
import { ToastService } from "../../../../core/services/toast";
import { InView } from "../../../../shared/directives/in-view";
import { UiButton, UiSkeleton } from "../../../../shared/ui";
import { rewindShareUrl } from "../../rewind";
import { rewindImageFileName } from "../../rewind-copy";
import { type RewindStoryImage } from "../../rewind-story-image";

export const REPEATED_ACTIVATION_WINDOW_MS = 800;

export type RewindPreviewSize = "full" | "fit-row";

const PREVIEW_HEIGHT_CLASS: Record<RewindPreviewSize, string> = {
	full: "h-[min(70vh,34rem)]",
	"fit-row": "h-[min(70vh,34rem)] lg:h-[24rem]"
};

const LAYOUT_CLASS: Record<RewindPreviewSize, string> = {
	full: "md:items-end",
	"fit-row": "md:items-end lg:items-start"
};

const SHARE_FAILED_MESSAGE = "Couldn't share the image. Download it instead.";

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function supportsFileSharing(navigatorRef: Navigator | undefined): boolean {
	if (typeof navigatorRef?.canShare !== "function") return false;
	const probe = new File([], "probe.png", { type: "image/png" });
	return navigatorRef.canShare({ files: [probe] });
}

@Component({
	selector: "app-rewind-share-actions",
	imports: [InView, UiButton, UiSkeleton],
	templateUrl: "./rewind-share-actions.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindShareActions {
	private readonly exportService = inject(ExportService);
	private readonly toast = inject(ToastService);
	private readonly navigatorRef = inject(DOCUMENT).defaultView?.navigator;

	readonly image = input.required<RewindStoryImage>();
	readonly previewAlt = input.required<string>();
	readonly previewSize = input<RewindPreviewSize>("full");

	protected readonly canShareFiles = supportsFileSharing(this.navigatorRef);
	protected readonly sharing = signal(false);
	protected readonly downloadPending = signal(false);
	private readonly lastActivation = new Map<string, number>();

	protected readonly previewHeightClass = computed(
		() => PREVIEW_HEIGHT_CLASS[this.previewSize()]
	);
	protected readonly layoutClass = computed(
		() => LAYOUT_CLASS[this.previewSize()]
	);
	protected readonly isReady = computed(() => !!this.image().blob());
	protected readonly fileName = computed(() => {
		const target = this.image().target();
		return target ? rewindImageFileName(target.username, target.year) : "";
	});

	constructor() {
		afterNextRender(() => {
			if (typeof IntersectionObserver === "undefined") this.preload();
		});
		effect(() => {
			const blob = this.image().blob();
			if (blob && this.downloadPending()) {
				this.downloadPending.set(false);
				this.save(blob);
			}
		});
		effect(() => {
			if (this.image().hasError()) this.downloadPending.set(false);
		});
	}

	protected async shareImage() {
		const blob = this.image().blob();
		if (!blob || this.sharing() || !this.activate("share")) return;
		this.sharing.set(true);
		const file = new File([blob], this.fileName(), { type: "image/png" });
		try {
			await this.navigatorRef!.share({
				files: [file],
				title: this.previewAlt()
			});
		} catch (error) {
			if (!isAbortError(error)) this.toast.error(SHARE_FAILED_MESSAGE);
		} finally {
			this.sharing.set(false);
		}
	}

	protected download() {
		if (this.downloadPending() || !this.activate("download")) return;
		const blob = this.image().blob();
		if (blob) {
			this.save(blob);
			return;
		}
		this.downloadPending.set(true);
		if (this.image().hasError()) this.image().retry();
		else this.image().request();
	}

	protected copyLink() {
		const target = this.image().target();
		if (!target || !this.activate("copy")) return;
		const clipboard = this.navigatorRef?.clipboard;
		if (!clipboard) {
			this.toast.warning("Couldn't copy the link.");
			return;
		}
		clipboard
			.writeText(rewindShareUrl(target.username, target.year))
			.then(() => this.toast.success("Link copied"))
			.catch(() => this.toast.warning("Couldn't copy the link."));
	}

	protected preload() {
		this.image().request();
	}

	protected retryPreview() {
		this.image().retry();
	}

	private save(blob: Blob) {
		this.exportService.saveFile(blob, this.fileName());
	}

	private activate(action: string): boolean {
		const now = performance.now();
		const last = this.lastActivation.get(action);
		if (last !== undefined && now - last < REPEATED_ACTIVATION_WINDOW_MS) {
			return false;
		}
		this.lastActivation.set(action, now);
		return true;
	}
}
