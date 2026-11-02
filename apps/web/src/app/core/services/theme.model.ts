export type ThemeId = "refined-dark" | "midnight-cyan" | "twilight-arcade";

export type ThemeTier = "free" | "premium";

export interface ThemeOption {
	id: ThemeId;
	name: string;
	description: string;
	tier: ThemeTier;
	swatches: string[];
	metaColor: string;
}
