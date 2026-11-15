import { type UiPickerOption } from "../../../shared/ui";

export const ROLE_OPTIONS: readonly UiPickerOption[] = [
	{ value: "user", label: "User", icon: "person" },
	{
		value: "premium",
		label: "Premium",
		icon: "workspace_premium",
		iconClass: "text-premium"
	},
	{
		value: "moderator",
		label: "Moderator",
		icon: "verified_user",
		iconClass: "text-info"
	},
	{
		value: "admin",
		label: "Admin",
		icon: "shield",
		iconClass: "text-admin"
	}
];
