import { type PickerOption } from "../../../shared/components/option-picker/option-picker.model";

export const ROLE_OPTIONS: readonly PickerOption[] = [
	{ value: "user", label: "User", icon: "person" },
	{ value: "premium", label: "Premium", icon: "workspace_premium" },
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
