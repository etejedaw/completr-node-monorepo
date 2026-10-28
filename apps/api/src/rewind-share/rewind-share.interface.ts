import { type SHARE_IMAGE_SIZES } from "./rewind-share.constants";

export type RewindImageFormat = keyof typeof SHARE_IMAGE_SIZES;

export interface ShareCover {
	title: string;
	dataUri: string | null;
}

export interface ShareArtwork {
	covers: ShareCover[];
	backdrop: string | null;
}

export interface SharePageMeta {
	title: string;
	description: string;
	imageUrl: string | null;
	redirectUrl: string;
}
