import { type WishlistPlatformOption } from "../components/wishlist-platform-choice.model";

export interface WishlistPlatformModalData {
	gameId: string;
	gameTitle: string;
	platforms: WishlistPlatformOption[];
}
