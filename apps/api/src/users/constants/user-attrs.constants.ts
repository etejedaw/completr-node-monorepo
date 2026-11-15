import { VISIBILITY_FIELDS } from "./visibility.constants";

export const USER_PUBLIC_ATTRS = [
	"id",
	"username",
	"name",
	"avatarUrl",
	"role"
];

export const USER_CARD_ATTRS = [...USER_PUBLIC_ATTRS, ...VISIBILITY_FIELDS];
