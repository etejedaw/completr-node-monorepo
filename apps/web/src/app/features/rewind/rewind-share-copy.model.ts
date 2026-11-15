export interface RewindShareCopy {
	share: string;
	ownerPreviewAlt: (year: number) => string;
	visitorPreviewAlt: (username: string, year: number) => string;
	gamesPreviewAlt: (previewAlt: string) => string;
	shareImage: string;
	shareImages: string;
	downloadImage: string;
	imagesLabel: string;
	summaryTab: string;
	gamesTab: string;
	downloadSummary: string;
	downloadGames: string;
	copyLink: string;
	imageFailed: string;
	tryAgain: string;
	preparingImage: string;
	shareFailed: string;
	sharesFailed: string;
	linkCopied: string;
	copyFailed: string;
}
