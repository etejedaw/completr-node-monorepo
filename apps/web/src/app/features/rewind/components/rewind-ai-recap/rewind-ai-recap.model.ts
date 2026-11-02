import { type RewindTone } from "../../rewind-tone";

export interface InsightStyle {
	icon: string;
	tone: RewindTone;
}

export interface InsightView {
	key: string;
	label: string;
	icon: string;
	tone: string;
	title: string;
	body: string;
	delayMs: number;
}
