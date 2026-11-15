import { type RewindShareCopy } from "./rewind-share-copy.model";

export const REWIND_SHARE_COPY: RewindShareCopy = {
	share: "Share",
	ownerPreviewAlt: year => `Your ${year} Rewind`,
	visitorPreviewAlt: (username, year) => `@${username}'s ${year} Rewind`,
	gamesPreviewAlt: previewAlt => `${previewAlt}: finished games`,
	shareImage: "Share image",
	shareImages: "Share images",
	downloadImage: "Download image",
	imagesLabel: "Story images",
	summaryTab: "Summary",
	gamesTab: "Games",
	downloadSummary: "Download summary",
	downloadGames: "Download games",
	copyLink: "Copy link",
	imageFailed: "Couldn't load the image.",
	tryAgain: "Try again",
	preparingImage: "Preparing the image",
	shareFailed: "Couldn't share the image. Download it instead.",
	sharesFailed: "Couldn't share the images. Download them instead.",
	linkCopied: "Link copied",
	copyFailed: "Couldn't copy the link."
};
