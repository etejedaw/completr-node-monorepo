export const DATA_REQUEST_ERROR_MESSAGES: Readonly<Record<string, string>> = {
	DATA_REQUEST_ALREADY_PENDING:
		"You already have a pending request of this type. We'll answer it within 30 days.",
	DATA_REQUEST_NOT_FOUND:
		"This request no longer exists. Refresh the page to see the current requests.",
	DATA_REQUEST_NOT_DOWNLOADABLE:
		"This request has no file to download. Only completed copies of your data can be downloaded.",
	DATA_REQUEST_EXPIRED:
		"This download has expired. Request a new copy of your data to get a fresh file.",
	DATA_REQUEST_NOT_PENDING:
		"This request was already resolved. Refresh the list to see its current state.",
	USER_DELETE_FORBIDDEN:
		"Admin accounts, including your own, can't be deleted. Change the role first if this account must go.",
	USER_NOT_FOUND:
		"This account no longer exists. Refresh the list to see the current users."
};
