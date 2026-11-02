import { type AvatarRing } from "../../../core/utils/premium";

export interface ActivityActor {
	username: string;
	displayName: string;
	avatarUrl: string | null | undefined;
	avatarRing: AvatarRing;
}
