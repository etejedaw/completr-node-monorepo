export type PublicListsKind = "official" | "community";

export interface PublicListsSectionCopy {
	heading: string;
	hint: string;
	pageSize: number;
	loadingLabel: string;
	errorTitle: string;
	hiddenWhenEmpty: boolean;
}
