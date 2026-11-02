import { type SettingsSection } from "./settings-sections.model";

export const SETTINGS_SECTIONS: SettingsSection[] = [
	{
		path: "profile",
		label: "Profile",
		icon: "person",
		description: "Name, bio and avatar"
	},
	{
		path: "privacy",
		label: "Privacy",
		icon: "lock",
		description: "Who sees each section"
	},
	{
		path: "appearance",
		label: "Appearance",
		icon: "palette",
		description: "Theme and colors"
	},
	{
		path: "security",
		label: "Security",
		icon: "shield",
		description: "Password and sessions"
	}
];
