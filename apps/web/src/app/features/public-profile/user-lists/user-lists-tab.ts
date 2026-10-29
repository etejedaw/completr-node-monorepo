export type ProfileListsTab = "created" | "following";

export const FOLLOWING_TAB_PARAM = "following";

export function parseProfileListsTab(value: string | null): ProfileListsTab {
	return value === FOLLOWING_TAB_PARAM ? "following" : "created";
}
