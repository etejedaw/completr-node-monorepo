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
import { UiButton, UiIconButton, UiSkeleton } from "../../../../shared/ui";
import { rewindShareUrl, type RewindStoryFormat } from "../../rewind";
import {
	rewindGamesImageFileName,
	rewindImageFileName
} from "../../rewind-copy";
import { REWIND_SHARE_COPY } from "../../rewind-share-copy";
import { type RewindStoryImage } from "../../rewind-story-image.model";
import { type RewindSharePage } from "./rewind-share-actions.model";

export const REPEATED_ACTIVATION_WINDOW_MS = 800;

export type RewindPreviewSize = "full" | "fit-row";

const LAYOUT_CLASS: Record<RewindPreviewSize, string> = {
	full: "mx-auto flex w-full max-w-[min(34rem,70dvh)] flex-col gap-3",
	"fit-row": "flex w-full flex-col gap-3"
};

const SINGLE_PAGE_CLASS = "mx-auto w-[min(100%,14rem)] grid-cols-1";

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function supportsFileSharing(
	navigatorRef: Navigator | undefined,
	fileCount: number
): boolean {
	if (typeof navigatorRef?.canShare !== "function") return false;
	const probes = Array.from(
		{ length: fileCount },
		(_, index) => new File([], `probe-${index}.png`, { type: "image/png" })
	);
	return navigatorRef.canShare({ files: probes });
}

function isSettled(page: RewindSharePage): boolean {
	return !!page.image.blob() || page.image.hasError();
}

@Component({
	selector: "app-rewind-share-actions",
	imports: [InView, UiButton, UiIconButton, UiSkeleton],
	templateUrl: "./rewind-share-actions.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindShareActions {
	private readonly exportService = inject(ExportService);
	private readonly toast = inject(ToastService);
	private readonly navigatorRef = inject(DOCUMENT).defaultView?.navigator;

	readonly image = input.required<RewindStoryImage>();
	readonly gamesImage = input<RewindStoryImage | null>(null);
	readonly previewAlt = input.required<string>();
	readonly previewSize = input<RewindPreviewSize>("full");

	protected readonly copy = REWIND_SHARE_COPY;

	protected readonly sharing = signal(false);
	protected readonly pendingDownloads = signal<
		ReadonlySet<RewindStoryFormat>
	>(new Set());
	private readonly lastActivation = new Map<string, number>();

	protected readonly pages = computed<RewindSharePage[]>(() => {
		const text = this.copy;
		const target = this.image().target();
		const gamesImage = this.gamesImage();
		const summary: RewindSharePage = {
			key: "story",
			image: this.image(),
			label: text.summaryLabel,
			alt: this.previewAlt(),
			downloadLabel: gamesImage
				? text.downloadSummary
				: text.downloadImage,
			shareLabel: text.shareSummary,
			fileName: target
				? rewindImageFileName(target.username, target.year)
				: ""
		};
		if (!gamesImage) return [summary];
		return [
			summary,
			{
				key: "story-list",
				image: gamesImage,
				label: text.gamesLabel,
				alt: text.gamesPreviewAlt(this.previewAlt()),
				downloadLabel: text.downloadGames,
				shareLabel: text.shareGames,
				fileName: target
					? rewindGamesImageFileName(target.username, target.year)
					: ""
			}
		];
	});

	protected readonly hasSeveralPages = computed(
		() => this.pages().length > 1
	);
	protected readonly canShareFiles = computed(() =>
		supportsFileSharing(this.navigatorRef, this.pages().length)
	);
	protected readonly isReady = computed(() => {
		const pages = this.pages();
		return (
			pages.every(isSettled) && pages.some(page => !!page.image.blob())
		);
	});
	protected readonly shareLabel = computed(() =>
		this.hasSeveralPages() ? this.copy.shareImages : this.copy.shareImage
	);
	protected readonly pagesClass = computed(() =>
		this.hasSeveralPages() ? "grid-cols-2" : SINGLE_PAGE_CLASS
	);

	protected readonly layoutClass = computed(
		() => LAYOUT_CLASS[this.previewSize()]
	);
	constructor() {
		afterNextRender(() => {
			if (typeof IntersectionObserver === "undefined") this.preload();
		});
		effect(() => {
			const pending = this.pendingDownloads();
			if (pending.size === 0) return;
			for (const page of this.pages()) {
				if (!pending.has(page.key)) continue;
				const blob = page.image.blob();
				if (blob) this.save(blob, page.fileName);
				else if (page.image.hasError())
					this.toast.error(this.copy.downloadFailed);
				if (blob || page.image.hasError())
					this.settleDownload(page.key);
			}
		});
	}

	protected shareImages() {
		if (!this.isReady()) return Promise.resolve();
		return this.shareFiles(this.pages(), "share");
	}

	protected sharePage(page: RewindSharePage) {
		return this.shareFiles([page], `share:${page.key}`);
	}

	private async shareFiles(pages: RewindSharePage[], action: string) {
		if (this.sharing() || !this.activate(action)) return;
		const files = pages.flatMap(page => {
			const blob = page.image.blob();
			return blob
				? [new File([blob], page.fileName, { type: "image/png" })]
				: [];
		});
		if (files.length === 0) return;
		this.sharing.set(true);
		try {
			await this.navigatorRef!.share({ files, title: this.previewAlt() });
		} catch (error) {
			if (!isAbortError(error)) {
				const text = this.copy;
				this.toast.error(
					files.length > 1 ? text.sharesFailed : text.shareFailed
				);
			}
		} finally {
			this.sharing.set(false);
		}
	}

	protected download(page: RewindSharePage) {
		if (
			this.pendingDownloads().has(page.key) ||
			!this.activate(`download:${page.key}`)
		)
			return;
		const blob = page.image.blob();
		if (blob) {
			this.save(blob, page.fileName);
			return;
		}
		this.pendingDownloads.update(pending => new Set(pending).add(page.key));
		if (page.image.hasError()) page.image.retry();
		else page.image.request();
	}

	protected copyLink() {
		const target = this.image().target();
		if (!target || !this.activate("copy")) return;
		const clipboard = this.navigatorRef?.clipboard;
		if (!clipboard) {
			this.toast.warning(this.copy.copyFailed);
			return;
		}
		clipboard
			.writeText(rewindShareUrl(target.username, target.year))
			.then(() => this.toast.success(this.copy.linkCopied))
			.catch(() => this.toast.warning(this.copy.copyFailed));
	}

	protected preload() {
		for (const page of this.pages()) page.image.request();
	}

	protected retryPreview(page: RewindSharePage) {
		page.image.retry();
	}

	private settleDownload(key: RewindStoryFormat) {
		this.pendingDownloads.update(pending => {
			const next = new Set(pending);
			next.delete(key);
			return next;
		});
	}

	private save(blob: Blob, fileName: string) {
		this.exportService.saveFile(blob, fileName);
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
