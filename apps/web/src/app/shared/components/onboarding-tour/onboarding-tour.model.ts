export interface SectionItem {
	icon: string;
	name: string;
	hint: string;
	colorClass: string;
}

export interface Step {
	heading: string;
	tagline: string;
	items: SectionItem[];
}
