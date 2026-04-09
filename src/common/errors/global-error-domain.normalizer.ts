import { authErrorDomainNormalizer } from "../../auth/errors/auth.error-domain.normalizer";
import { usersErrorDomainNormalizer } from "../../users/errors/users.error-domain.normalizer";
import { gamesErrorDomainNormalizer } from "../../games/errors/games.error-domain.normalizer";
import { platformsErrorDomainNormalizer } from "../../platforms/errors/platforms.error-domain.normalizer";
import { genresErrorDomainNormalizer } from "../../genres/errors/genres.error-domain.normalizer";
import { gameShelfErrorDomainNormalizer } from "../../game-shelf/errors/game-shelf.error-domain.normalizer";
import { gameScoresErrorDomainNormalizer } from "../../game-scores/errors/game-scores.error-domain.normalizer";
import { gameTimesErrorDomainNormalizer } from "../../game-times/errors/game-times.error-domain.normalizer";
import { backlogErrorDomainNormalizer } from "../../backlog/errors/backlog.error-domain.normalizer";
import { savedFiltersErrorDomainNormalizer } from "../../saved-filters/errors/saved-filters.error-domain.normalizer";
import { listsErrorDomainNormalizer } from "../../lists/errors/lists.error-domain.normalizer";
import { listItemsErrorDomainNormalizer } from "../../list-items/errors/list-items.error-domain.normalizer";
import { listFollowersErrorDomainNormalizer } from "../../list-followers/errors/list-followers.error-domain.normalizer";
import { wishlistErrorDomainNormalizer } from "../../wishlist/errors/wishlist.error-domain.normalizer";
import { favoritesErrorDomainNormalizer } from "../../favorites/errors/favorites.error-domain.normalizer";
import { DomainError } from "./domain-error";
import { ServiceError } from "./service-error";

export function globalErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return globalServiceErrorMapper(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}

function globalServiceErrorMapper(
	error: ServiceError,
	correlationId: string
): DomainError {
	if (error.serviceError.service === "Users Service")
		return usersErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Auth Service")
		return authErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Games Service")
		return gamesErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Platform Service")
		return platformsErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Genre Service")
		return genresErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "GameShelf Service")
		return gameShelfErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "GameScore Service")
		return gameScoresErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "GameTime Service")
		return gameTimesErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Backlog Service")
		return backlogErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "SavedFilter Service")
		return savedFiltersErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "List Service")
		return listsErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "ListItem Service")
		return listItemsErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "ListFollower Service")
		return listFollowersErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Wishlist Service")
		return wishlistErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Favorite Service")
		return favoritesErrorDomainNormalizer(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}
