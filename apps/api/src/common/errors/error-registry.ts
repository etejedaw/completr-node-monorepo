import { activityDomainToHttpMapper } from "../../activity/errors/activity.domain-to-http.mapper";
import { authDomainToHttpMapper } from "../../auth/errors/auth.domain-to-http.mapper";
import { authErrorDomainNormalizer } from "../../auth/errors/auth.error-domain.normalizer";
import { backlogDomainToHttpMapper } from "../../backlog/errors/backlog.domain-to-http.mapper";
import { backlogErrorDomainNormalizer } from "../../backlog/errors/backlog.error-domain.normalizer";
import { backlogProgressDomainToHttpMapper } from "../../backlog-progress/errors/backlog-progress.domain-to-http.mapper";
import { backlogProgressErrorDomainNormalizer } from "../../backlog-progress/errors/backlog-progress.error-domain.normalizer";
import { coopRunsDomainToHttpMapper } from "../../coop-runs/errors/coop-runs.domain-to-http.mapper";
import { coopRunsErrorDomainNormalizer } from "../../coop-runs/errors/coop-runs.error-domain.normalizer";
import { dataRequestsDomainToHttpMapper } from "../../data-requests/errors/data-requests.domain-to-http.mapper";
import { dataRequestsErrorDomainNormalizer } from "../../data-requests/errors/data-requests.error-domain.normalizer";
import { favoritesDomainToHttpMapper } from "../../favorites/errors/favorites.domain-to-http.mapper";
import { favoritesErrorDomainNormalizer } from "../../favorites/errors/favorites.error-domain.normalizer";
import { franchisesDomainToHttpMapper } from "../../franchises/errors/franchises.domain-to-http.mapper";
import { franchisesErrorDomainNormalizer } from "../../franchises/errors/franchises.error-domain.normalizer";
import { gameExternalDomainToHttpMapper } from "../../game-external/errors/game-external.domain-to-http.mapper";
import { gameExternalErrorDomainNormalizer } from "../../game-external/errors/game-external.error-domain.normalizer";
import { gamePlatinumDomainToHttpMapper } from "../../game-platinum/errors/game-platinum.domain-to-http.mapper";
import { gamePlatinumErrorDomainNormalizer } from "../../game-platinum/errors/game-platinum.error-domain.normalizer";
import { gameReportsDomainToHttpMapper } from "../../game-reports/errors/game-reports.domain-to-http.mapper";
import { gameReportsErrorDomainNormalizer } from "../../game-reports/errors/game-reports.error-domain.normalizer";
import { gameScoresDomainToHttpMapper } from "../../game-scores/errors/game-scores.domain-to-http.mapper";
import { gameScoresErrorDomainNormalizer } from "../../game-scores/errors/game-scores.error-domain.normalizer";
import { gameShelfDomainToHttpMapper } from "../../game-shelf/errors/game-shelf.domain-to-http.mapper";
import { gameShelfErrorDomainNormalizer } from "../../game-shelf/errors/game-shelf.error-domain.normalizer";
import { gameTimesDomainToHttpMapper } from "../../game-times/errors/game-times.domain-to-http.mapper";
import { gameTimesErrorDomainNormalizer } from "../../game-times/errors/game-times.error-domain.normalizer";
import { gamesDomainToHttpMapper } from "../../games/errors/games.domain-to-http.mapper";
import { gamesErrorDomainNormalizer } from "../../games/errors/games.error-domain.normalizer";
import { genresDomainToHttpMapper } from "../../genres/errors/genres.domain-to-http.mapper";
import { genresErrorDomainNormalizer } from "../../genres/errors/genres.error-domain.normalizer";
import { hltbDomainToHttpMapper } from "../../hltb/errors/hltb.domain-to-http.mapper";
import { hltbErrorDomainNormalizer } from "../../hltb/errors/hltb.error-domain.normalizer";
import { iaDomainToHttpMapper } from "../../ia/errors/ia.domain-to-http.mapper";
import { iaErrorDomainNormalizer } from "../../ia/errors/ia.error-domain.normalizer";
import { igdbDomainToHttpMapper } from "../../igdb/errors/igdb.domain-to-http.mapper";
import { igdbErrorDomainNormalizer } from "../../igdb/errors/igdb.error-domain.normalizer";
import { invitationsDomainToHttpMapper } from "../../invitations/errors/invitations.domain-to-http.mapper";
import { invitationsErrorDomainNormalizer } from "../../invitations/errors/invitations.error-domain.normalizer";
import { jobsDomainToHttpMapper } from "../../jobs/errors/jobs.domain-to-http.mapper";
import { jobsErrorDomainNormalizer } from "../../jobs/errors/jobs.error-domain.normalizer";
import { listFollowersDomainToHttpMapper } from "../../list-followers/errors/list-followers.domain-to-http.mapper";
import { listFollowersErrorDomainNormalizer } from "../../list-followers/errors/list-followers.error-domain.normalizer";
import { listItemsDomainToHttpMapper } from "../../list-items/errors/list-items.domain-to-http.mapper";
import { listItemsErrorDomainNormalizer } from "../../list-items/errors/list-items.error-domain.normalizer";
import { listsDomainToHttpMapper } from "../../lists/errors/lists.domain-to-http.mapper";
import { listsErrorDomainNormalizer } from "../../lists/errors/lists.error-domain.normalizer";
import { mailDomainToHttpMapper } from "../../mail/errors/mail.domain-to-http.mapper";
import { mailErrorDomainNormalizer } from "../../mail/errors/mail.error-domain.normalizer";
import { metacriticDomainToHttpMapper } from "../../metacritic/errors/metacritic.domain-to-http.mapper";
import { metacriticErrorDomainNormalizer } from "../../metacritic/errors/metacritic.error-domain.normalizer";
import { moodTagsDomainToHttpMapper } from "../../mood-tags/errors/mood-tags.domain-to-http.mapper";
import { moodTagsErrorDomainNormalizer } from "../../mood-tags/errors/mood-tags.error-domain.normalizer";
import { platformsDomainToHttpMapper } from "../../platforms/errors/platforms.domain-to-http.mapper";
import { platformsErrorDomainNormalizer } from "../../platforms/errors/platforms.error-domain.normalizer";
import { premiumAccessDomainToHttpMapper } from "../../premium-access/errors/premium-access.domain-to-http.mapper";
import { premiumAccessErrorDomainNormalizer } from "../../premium-access/errors/premium-access.error-domain.normalizer";
import { queueDomainToHttpMapper } from "../../queue/errors/queue.domain-to-http.mapper";
import { queueErrorDomainNormalizer } from "../../queue/errors/queue.error-domain.normalizer";
import { rawgDomainToHttpMapper } from "../../rawg/errors/rawg.domain-to-http.mapper";
import { rawgErrorDomainNormalizer } from "../../rawg/errors/rawg.error-domain.normalizer";
import { reviewsDomainToHttpMapper } from "../../reviews/errors/reviews.domain-to-http.mapper";
import { reviewsErrorDomainNormalizer } from "../../reviews/errors/reviews.error-domain.normalizer";
import { rewindDomainToHttpMapper } from "../../rewind/errors/rewind.domain-to-http.mapper";
import { rewindErrorDomainNormalizer } from "../../rewind/errors/rewind.error-domain.normalizer";
import { rewindEditionsDomainToHttpMapper } from "../../rewind-editions/errors/rewind-editions.domain-to-http.mapper";
import { rewindEditionsErrorDomainNormalizer } from "../../rewind-editions/errors/rewind-editions.error-domain.normalizer";
import { savedFiltersDomainToHttpMapper } from "../../saved-filters/errors/saved-filters.domain-to-http.mapper";
import { savedFiltersErrorDomainNormalizer } from "../../saved-filters/errors/saved-filters.error-domain.normalizer";
import { scoreSourcesDomainToHttpMapper } from "../../score-sources/errors/score-sources.domain-to-http.mapper";
import { scoreSourcesErrorDomainNormalizer } from "../../score-sources/errors/score-sources.error-domain.normalizer";
import { userFollowRequestsDomainToHttpMapper } from "../../user-follow-requests/errors/user-follow-requests.domain-to-http.mapper";
import { userFollowRequestsErrorDomainNormalizer } from "../../user-follow-requests/errors/user-follow-requests.error-domain.normalizer";
import { userFollowersDomainToHttpMapper } from "../../user-followers/errors/user-followers.domain-to-http.mapper";
import { userFollowersErrorDomainNormalizer } from "../../user-followers/errors/user-followers.error-domain.normalizer";
import { usersDomainToHttpMapper } from "../../users/errors/users.domain-to-http.mapper";
import { usersErrorDomainNormalizer } from "../../users/errors/users.error-domain.normalizer";
import { wikidataDomainToHttpMapper } from "../../wikidata/errors/wikidata.domain-to-http.mapper";
import { wikidataErrorDomainNormalizer } from "../../wikidata/errors/wikidata.error-domain.normalizer";
import { wishlistDomainToHttpMapper } from "../../wishlist/errors/wishlist.domain-to-http.mapper";
import { wishlistErrorDomainNormalizer } from "../../wishlist/errors/wishlist.error-domain.normalizer";
import {
	type DomainToHttpMapper,
	type ErrorDomainNormalizer
} from "../types/error.types";

export const SERVICE_ERROR_NORMALIZERS: Record<string, ErrorDomainNormalizer> =
	{
		"Users Service": usersErrorDomainNormalizer,
		"Auth Service": authErrorDomainNormalizer,
		"Games Service": gamesErrorDomainNormalizer,
		"Platform Service": platformsErrorDomainNormalizer,
		"Genre Service": genresErrorDomainNormalizer,
		"Franchise Service": franchisesErrorDomainNormalizer,
		"GameShelf Service": gameShelfErrorDomainNormalizer,
		"ScoreSource Service": scoreSourcesErrorDomainNormalizer,
		"GameScore Service": gameScoresErrorDomainNormalizer,
		"GameTime Service": gameTimesErrorDomainNormalizer,
		"Backlog Service": backlogErrorDomainNormalizer,
		"SavedFilter Service": savedFiltersErrorDomainNormalizer,
		"List Service": listsErrorDomainNormalizer,
		"ListItem Service": listItemsErrorDomainNormalizer,
		"ListFollower Service": listFollowersErrorDomainNormalizer,
		"Queue Service": queueErrorDomainNormalizer,
		"Wishlist Service": wishlistErrorDomainNormalizer,
		"Favorite Service": favoritesErrorDomainNormalizer,
		"GameReport Service": gameReportsErrorDomainNormalizer,
		"Jobs Service": jobsErrorDomainNormalizer,
		"UserFollower Service": userFollowersErrorDomainNormalizer,
		"UserFollowRequest Service": userFollowRequestsErrorDomainNormalizer,
		"Review Service": reviewsErrorDomainNormalizer,
		"Rewind Service": rewindErrorDomainNormalizer,
		"Rewind Editions Service": rewindEditionsErrorDomainNormalizer,
		"MoodTags Service": moodTagsErrorDomainNormalizer,
		"GamePlatinum Service": gamePlatinumErrorDomainNormalizer,
		"BacklogProgress Service": backlogProgressErrorDomainNormalizer,
		"CoopRuns Service": coopRunsErrorDomainNormalizer,
		"Premium Access Service": premiumAccessErrorDomainNormalizer,
		"RAWG Provider": rawgErrorDomainNormalizer,
		"IGDB Provider": igdbErrorDomainNormalizer,
		"HLTB Provider": hltbErrorDomainNormalizer,
		"Metacritic Provider": metacriticErrorDomainNormalizer,
		"Wikidata Provider": wikidataErrorDomainNormalizer,
		"IA Provider": iaErrorDomainNormalizer,
		"Invitation Service": invitationsErrorDomainNormalizer,
		"Data Requests Service": dataRequestsErrorDomainNormalizer,
		"Mail Provider": mailErrorDomainNormalizer,
		"Game External Service": gameExternalErrorDomainNormalizer
	};

export const DOMAIN_ERROR_HTTP_MAPPERS: Record<string, DomainToHttpMapper> = {
	"User Module": usersDomainToHttpMapper,
	"Auth Module": authDomainToHttpMapper,
	"Game Module": gamesDomainToHttpMapper,
	"Platform Module": platformsDomainToHttpMapper,
	"Genre Module": genresDomainToHttpMapper,
	"Game External Module": gameExternalDomainToHttpMapper,
	"Franchise Module": franchisesDomainToHttpMapper,
	"GameShelf Module": gameShelfDomainToHttpMapper,
	"ScoreSource Module": scoreSourcesDomainToHttpMapper,
	"GameScore Module": gameScoresDomainToHttpMapper,
	"GameTime Module": gameTimesDomainToHttpMapper,
	"Backlog Module": backlogDomainToHttpMapper,
	"SavedFilter Module": savedFiltersDomainToHttpMapper,
	"List Module": listsDomainToHttpMapper,
	"ListItem Module": listItemsDomainToHttpMapper,
	"ListFollower Module": listFollowersDomainToHttpMapper,
	"Queue Module": queueDomainToHttpMapper,
	"Wishlist Module": wishlistDomainToHttpMapper,
	"Favorite Module": favoritesDomainToHttpMapper,
	"GameReport Module": gameReportsDomainToHttpMapper,
	"Jobs Module": jobsDomainToHttpMapper,
	"UserFollower Module": userFollowersDomainToHttpMapper,
	"UserFollowRequest Module": userFollowRequestsDomainToHttpMapper,
	"Review Module": reviewsDomainToHttpMapper,
	"Rewind Module": rewindDomainToHttpMapper,
	"Rewind Editions Module": rewindEditionsDomainToHttpMapper,
	"MoodTags Module": moodTagsDomainToHttpMapper,
	"GamePlatinum Module": gamePlatinumDomainToHttpMapper,
	"BacklogProgress Module": backlogProgressDomainToHttpMapper,
	"CoopRuns Module": coopRunsDomainToHttpMapper,
	"Premium Access Module": premiumAccessDomainToHttpMapper,
	"Activity Module": activityDomainToHttpMapper,
	"RAWG Provider": rawgDomainToHttpMapper,
	"IGDB Provider": igdbDomainToHttpMapper,
	"HLTB Provider": hltbDomainToHttpMapper,
	"Metacritic Provider": metacriticDomainToHttpMapper,
	"Wikidata Provider": wikidataDomainToHttpMapper,
	"IA Provider": iaDomainToHttpMapper,
	"Invitation Module": invitationsDomainToHttpMapper,
	"Data Request Module": dataRequestsDomainToHttpMapper,
	"Mail Provider": mailDomainToHttpMapper
};
