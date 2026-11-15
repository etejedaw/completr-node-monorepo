export const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
export const IGDB_REQUEST_TIMEOUT_MS = 5000;
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 500;
export const MAIN_GAME_TYPE_ID = 0;
export const GAME_FIELDS = [
	"id",
	"name",
	"slug",
	"summary",
	"first_release_date",
	"rating",
	"rating_count",
	"url",
	"game_type.id",
	"game_type.type",
	"cover.id",
	"cover.image_id",
	"platforms.id",
	"platforms.slug",
	"genres.id",
	"genres.slug",
	"themes.id",
	"themes.slug",
	"artworks.id",
	"artworks.image_id",
	"artworks.width",
	"artworks.height",
	"artworks.image_type",
	"screenshots.id",
	"screenshots.image_id",
	"screenshots.width",
	"screenshots.height"
].join(",");

export const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
export const REJECTED_CREDENTIALS_STATUSES = new Set([400, 401, 403]);
export const TOKEN_REQUEST_TIMEOUT_MS = 5000;
