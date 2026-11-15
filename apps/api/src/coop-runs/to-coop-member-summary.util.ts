import { type CoopMemberSummary } from "../backlog/backlog.interface";
import { type Backlog } from "../backlog/backlog.model";

export function toCoopMemberSummary(peer: Backlog): CoopMemberSummary {
	const user = peer.User;
	return {
		userId: peer.userId,
		username: user?.username ?? "",
		name: user?.name ?? "",
		avatarUrl: user?.avatarUrl ?? null,
		backlogId: peer.id
	};
}
