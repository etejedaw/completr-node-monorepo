export type RegisterGameshelfDto = {
	userId: string;
	gameId: string;
	platformId: string;
	acquiredAt?: Date;
	edition?: string;
	notes?: string;
};
