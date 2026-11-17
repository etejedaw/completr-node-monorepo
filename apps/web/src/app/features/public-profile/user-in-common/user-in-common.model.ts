import { type ComparisonGame } from "../services/public-library.model";

export type InCommonGame = Omit<
	ComparisonGame,
	"coverUrl" | "backgroundUrl"
> & {
	coverUrl?: string;
	backgroundUrl?: string;
};
