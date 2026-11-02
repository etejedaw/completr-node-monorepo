export interface CollectionPlatform {
	id: string;
	abbreviation: string;
}

export interface CollectionGame {
	title: string;
	backgroundUrl?: string;
}

export interface CollectionPage<T> {
	items: T[];
	total: number;
}
