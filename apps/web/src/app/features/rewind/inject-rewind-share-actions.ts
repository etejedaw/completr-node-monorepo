import {
	afterNextRender,
	computed,
	DOCUMENT,
	effect,
	inject,
	signal
} from "@angular/core";

import { ExportService } from "../../core/services/export";
import { ToastService } from "../../core/services/toast";
import {
	type RewindShareActionsSource,
	type RewindShareActionsState,
	type RewindSharePage
} from "./inject-rewind-share-actions.model";
import { rewindShareUrl, type RewindStoryFormat } from "./rewind";
import { rewindGamesImageFileName, rewindImageFileName } from "./rewind-copy";
import { REWIND_SHARE_COPY } from "./rewind-share-copy";

export const REPEATED_ACTIVATION_WINDOW_MS = 800;

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

export function injectRewindShareActions(
	source: RewindShareActionsSource
): RewindShareActionsState {
	const exportService = inject(ExportService);
	const toast = inject(ToastService);
	const navigatorRef = inject(DOCUMENT).defaultView?.navigator;
	const copy = REWIND_SHARE_COPY;
	const lastActivation = new Map<string, number>();

	const sharing = signal(false);
	const pendingDownloads = signal<ReadonlySet<RewindStoryFormat>>(new Set());

	const pages = computed<RewindSharePage[]>(() => {
		const image = source.image();
		const gamesImage = source.gamesImage();
		const previewAlt = source.previewAlt();
		const target = image.target();
		const summary: RewindSharePage = {
			key: "story",
			image,
			label: copy.summaryLabel,
			alt: previewAlt,
			downloadLabel: gamesImage
				? copy.downloadSummary
				: copy.downloadImage,
			shareLabel: copy.shareSummary,
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
				label: copy.gamesLabel,
				alt: copy.gamesPreviewAlt(previewAlt),
				downloadLabel: copy.downloadGames,
				shareLabel: copy.shareGames,
				fileName: target
					? rewindGamesImageFileName(target.username, target.year)
					: ""
			}
		];
	});

	const hasSeveralPages = computed(() => pages().length > 1);
	const canShareFiles = computed(() =>
		supportsFileSharing(navigatorRef, pages().length)
	);
	const isReady = computed(() => {
		const current = pages();
		return (
			current.every(isSettled) &&
			current.some(page => !!page.image.blob())
		);
	});
	const shareLabel = computed(() =>
		hasSeveralPages() ? copy.shareImages : copy.shareImage
	);

	function activate(action: string): boolean {
		const now = performance.now();
		const last = lastActivation.get(action);
		if (last !== undefined && now - last < REPEATED_ACTIVATION_WINDOW_MS) {
			return false;
		}
		lastActivation.set(action, now);
		return true;
	}

	function save(blob: Blob, fileName: string) {
		exportService.saveFile(blob, fileName);
	}

	function settleDownload(key: RewindStoryFormat) {
		pendingDownloads.update(pending => {
			const next = new Set(pending);
			next.delete(key);
			return next;
		});
	}

	async function shareFiles(shared: RewindSharePage[], action: string) {
		if (sharing() || !activate(action)) return;
		const files = shared.flatMap(page => {
			const blob = page.image.blob();
			return blob
				? [new File([blob], page.fileName, { type: "image/png" })]
				: [];
		});
		if (files.length === 0) return;
		sharing.set(true);
		try {
			await navigatorRef!.share({ files, title: source.previewAlt() });
		} catch (error) {
			if (!isAbortError(error)) {
				toast.error(
					files.length > 1 ? copy.sharesFailed : copy.shareFailed
				);
			}
		} finally {
			sharing.set(false);
		}
	}

	function download(page: RewindSharePage) {
		if (
			pendingDownloads().has(page.key) ||
			!activate(`download:${page.key}`)
		)
			return;
		const blob = page.image.blob();
		if (blob) {
			save(blob, page.fileName);
			return;
		}
		pendingDownloads.update(pending => new Set(pending).add(page.key));
		if (page.image.hasError()) page.image.retry();
		else page.image.request();
	}

	function preload() {
		for (const page of pages()) page.image.request();
	}

	afterNextRender(() => {
		if (typeof IntersectionObserver === "undefined") preload();
	});

	effect(() => {
		const pending = pendingDownloads();
		if (pending.size === 0) return;
		for (const page of pages()) {
			if (!pending.has(page.key)) continue;
			const blob = page.image.blob();
			if (blob) save(blob, page.fileName);
			else if (page.image.hasError()) toast.error(copy.downloadFailed);
			if (blob || page.image.hasError()) settleDownload(page.key);
		}
	});

	return {
		pages,
		hasSeveralPages,
		canShareFiles,
		isReady,
		shareLabel,
		sharing: sharing.asReadonly(),
		pendingDownloads: pendingDownloads.asReadonly(),
		shareImages() {
			if (!isReady()) return Promise.resolve();
			return shareFiles(pages(), "share");
		},
		sharePage(page) {
			return shareFiles([page], `share:${page.key}`);
		},
		download,
		downloadAll() {
			for (const page of pages()) download(page);
		},
		copyLink() {
			const target = source.image().target();
			if (!target || !activate("copy")) return;
			const clipboard = navigatorRef?.clipboard;
			if (!clipboard) {
				toast.warning(copy.copyFailed);
				return;
			}
			clipboard
				.writeText(rewindShareUrl(target.username, target.year))
				.then(() => toast.success(copy.linkCopied))
				.catch(() => toast.warning(copy.copyFailed));
		},
		preload,
		retryPreview(page) {
			page.image.retry();
		}
	};
}
