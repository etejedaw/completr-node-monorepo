import { environmentConfig } from "../common/config/environment.config";
import { createCachedJsonProxy } from "../common/utils/cached-json-proxy.util";

export const getPrivacyPolicy = createCachedJsonProxy({
	sourceUrl: environmentConfig.PRIVACY_SOURCE_URL,
	unavailableMessage: "Privacy policy source unavailable"
});
