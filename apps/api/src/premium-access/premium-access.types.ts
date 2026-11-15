import { type PremiumGrantExpirationInput } from "./premium-access.interface";

export type PremiumAccessSource =
	"role" | "full-grant" | "feature-grant" | null;

export type UpdatePremiumGrantExpirationInput = Omit<
	PremiumGrantExpirationInput,
	"feature"
>;
