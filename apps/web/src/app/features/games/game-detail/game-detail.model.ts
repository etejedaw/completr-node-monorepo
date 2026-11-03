export interface ReportModalState {
	show: boolean;
	message: string;
	submitting: boolean;
	sent: boolean;
	error: string;
}

export interface ExternalLinkView {
	source: string;
	label: string;
	href: string;
}
