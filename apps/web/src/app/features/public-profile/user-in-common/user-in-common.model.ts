import { type ComparisonGame } from "../services/public-library.model";

export type InCommonGame = Omit<ComparisonGame, "backgroundUrl"> & {
	backgroundUrl?: string;
};
