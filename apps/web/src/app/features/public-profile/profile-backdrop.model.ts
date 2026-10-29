import { type PublicProfile } from "./public-profile.model";
import { type PublicFavorite } from "./services/public-library.model";

export interface ProfileBackdropSources {
	profile: Pick<PublicProfile, "backlogs" | "recentActivity"> | null;
	favorites: readonly Pick<PublicFavorite, "game">[] | null;
	showsFavorites: boolean;
}
