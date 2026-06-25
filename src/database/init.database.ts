import { setupAssociations } from "./associations.database";

import "../users/user.model";
import "../games/game.model";
import "../platforms/platform.model";
import "../genres/genres.model";
import "../game-platform/game-platform.model";
import "../game-genre/game-genre.model";
import "../game-shelf/game-shelf.model";
import "../lists/list.model";
import "../list-items/list-item.model";
import "../list-followers/list-follower.model";
import "../backlog/backlog.model";
import "../backlog-progress/backlog-progress.model";
import "../coop-runs/coop-run.model";
import "../game-scores/game-score.model";
import "../game-times/game-time.model";
import "../game-popularity/game-popularity.model";
import "../mood-tags/user-game-tag.model";
import "../mood-tags/mood-tag-meta.model";
import "../saved-filters/saved-filter.model";
import "../queue/queue.model";
import "../wishlist/wishlist.model";
import "../favorites/favorite.model";
import "../game-external/game-external.model";
import "../score-sources/score-source.model";
import "../auth/refresh-token.model";
import "../game-reports/game-report.model";
import "../user-followers/user-follower.model";
import "../user-follow-requests/user-follow-request.model";
import "../activity/activity.model";
import "../activity/targets/activity-game.model";
import "../activity/targets/activity-list.model";
import "../activity/targets/activity-user.model";
import "../audit/audit.model";
import "../reviews/review.model";
import "../jobs/job.model";

export async function initDatabase() {
	setupAssociations();
}
