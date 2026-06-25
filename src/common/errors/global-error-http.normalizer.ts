import { Request } from "express";
import { authDomainToHttpMapper } from "../../auth/errors/auth.domain-to-http.mapper";
import { usersDomainToHttpMapper } from "../../users/errors/users.domain-to-http.mapper";
import { gamesDomainToHttpMapper } from "../../games/errors/games.domain-to-http.mapper";
import { platformsDomainToHttpMapper } from "../../platforms/errors/platforms.domain-to-http.mapper";
import { genresDomainToHttpMapper } from "../../genres/errors/genres.domain-to-http.mapper";
import { gameShelfDomainToHttpMapper } from "../../game-shelf/errors/game-shelf.domain-to-http.mapper";
import { gameScoresDomainToHttpMapper } from "../../game-scores/errors/game-scores.domain-to-http.mapper";
import { gameTimesDomainToHttpMapper } from "../../game-times/errors/game-times.domain-to-http.mapper";
import { backlogDomainToHttpMapper } from "../../backlog/errors/backlog.domain-to-http.mapper";
import { savedFiltersDomainToHttpMapper } from "../../saved-filters/errors/saved-filters.domain-to-http.mapper";
import { listsDomainToHttpMapper } from "../../lists/errors/lists.domain-to-http.mapper";
import { listItemsDomainToHttpMapper } from "../../list-items/errors/list-items.domain-to-http.mapper";
import { listFollowersDomainToHttpMapper } from "../../list-followers/errors/list-followers.domain-to-http.mapper";
import { queueDomainToHttpMapper } from "../../queue/errors/queue.domain-to-http.mapper";
import { wishlistDomainToHttpMapper } from "../../wishlist/errors/wishlist.domain-to-http.mapper";
import { favoritesDomainToHttpMapper } from "../../favorites/errors/favorites.domain-to-http.mapper";
import { gameReportsDomainToHttpMapper } from "../../game-reports/errors/game-reports.domain-to-http.mapper";
import { userFollowersDomainToHttpMapper } from "../../user-followers/errors/user-followers.domain-to-http.mapper";
import { userFollowRequestsDomainToHttpMapper } from "../../user-follow-requests/errors/user-follow-requests.domain-to-http.mapper";
import { reviewsDomainToHttpMapper } from "../../reviews/errors/reviews.domain-to-http.mapper";
import { moodTagsDomainToHttpMapper } from "../../mood-tags/errors/mood-tags.domain-to-http.mapper";
import { backlogProgressDomainToHttpMapper } from "../../backlog-progress/errors/backlog-progress.domain-to-http.mapper";

import { commonDomainToHttpMapper } from "./common.domain-to-http.mapper";
import { DomainError } from "./domain-error";
import { HttpError } from "./http-error";

export function globalErrorHttpNormalizer(
	error: DomainError,
	request: Request
) {
	if (error.module === "User Module")
		return usersDomainToHttpMapper(error, request);

	if (error.module === "Auth Module")
		return authDomainToHttpMapper(error, request);

	if (error.module === "Game Module")
		return gamesDomainToHttpMapper(error, request);

	if (error.module === "Platform Module")
		return platformsDomainToHttpMapper(error, request);

	if (error.module === "Genre Module")
		return genresDomainToHttpMapper(error, request);

	if (error.module === "GameShelf Module")
		return gameShelfDomainToHttpMapper(error, request);

	if (error.module === "GameScore Module")
		return gameScoresDomainToHttpMapper(error, request);

	if (error.module === "GameTime Module")
		return gameTimesDomainToHttpMapper(error, request);

	if (error.module === "Backlog Module")
		return backlogDomainToHttpMapper(error, request);

	if (error.module === "SavedFilter Module")
		return savedFiltersDomainToHttpMapper(error, request);

	if (error.module === "List Module")
		return listsDomainToHttpMapper(error, request);

	if (error.module === "ListItem Module")
		return listItemsDomainToHttpMapper(error, request);

	if (error.module === "ListFollower Module")
		return listFollowersDomainToHttpMapper(error, request);

	if (error.module === "Queue Module")
		return queueDomainToHttpMapper(error, request);

	if (error.module === "Wishlist Module")
		return wishlistDomainToHttpMapper(error, request);

	if (error.module === "Favorite Module")
		return favoritesDomainToHttpMapper(error, request);

	if (error.module === "GameReport Module")
		return gameReportsDomainToHttpMapper(error, request);

	if (error.module === "UserFollower Module")
		return userFollowersDomainToHttpMapper(error, request);

	if (error.module === "UserFollowRequest Module")
		return userFollowRequestsDomainToHttpMapper(error, request);

	if (error.module === "Review Module")
		return reviewsDomainToHttpMapper(error, request);

	if (error.module === "MoodTags Module")
		return moodTagsDomainToHttpMapper(error, request);

	if (error.module === "BacklogProgress Module")
		return backlogProgressDomainToHttpMapper(error, request);

	if (error.module === "Common Module" || error.module === "COMMON")
		return commonDomainToHttpMapper(error, request);

	return new HttpError({
		type: error.code,
		title: error.message,
		status: 500,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context
	});
}
