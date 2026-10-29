export type FollowResult =
	| { status: "accepted"; targetId: string }
	| { status: "pending"; targetId: string };
