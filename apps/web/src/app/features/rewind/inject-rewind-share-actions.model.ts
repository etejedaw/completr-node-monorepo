import { type Signal } from "@angular/core";

import { type RewindStoryFormat } from "./rewind";
import { type RewindStoryImage } from "./rewind-story-image.model";

export interface RewindSharePage {
	key: RewindStoryFormat;
	image: RewindStoryImage;
	label: string;
	alt: string;
	downloadLabel: string;
	shareLabel: string;
	fileName: string;
}

export interface RewindShareActionsSource {
	image: () => RewindStoryImage;
	gamesImage: () => RewindStoryImage | null;
	previewAlt: () => string;
}

export interface RewindShareActionsState {
	readonly pages: Signal<RewindSharePage[]>;
	readonly hasSeveralPages: Signal<boolean>;
	readonly canShareFiles: Signal<boolean>;
	readonly isReady: Signal<boolean>;
	readonly shareLabel: Signal<string>;
	readonly sharing: Signal<boolean>;
	readonly pendingDownloads: Signal<ReadonlySet<RewindStoryFormat>>;
	shareImages(): Promise<void>;
	sharePage(page: RewindSharePage): Promise<void>;
	download(page: RewindSharePage): void;
	downloadAll(): void;
	copyLink(): void;
	preload(): void;
	retryPreview(page: RewindSharePage): void;
}
