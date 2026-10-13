import { environmentConfig } from "../common/config/environment.config";
import { createCachedJsonProxy } from "../common/utils/cached-json-proxy.util";

export const getChangelog = createCachedJsonProxy({
	sourceUrl: environmentConfig.CHANGELOG_SOURCE_URL,
	unavailableMessage: "Changelog source unavailable"
});
