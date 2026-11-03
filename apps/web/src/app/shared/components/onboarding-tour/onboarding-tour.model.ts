export interface SectionItem {
	icon: string;
	name: string;
	hint: string;
	colorClass: string;
}

export interface Step {
	icon: string;
	heading: string;
	tagline: string;
	items: SectionItem[];
}
