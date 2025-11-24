export type CreateUserDto = {
	username: string;
	email: string;
	password: string;
	name: string;
	bio?: string;
	avatarUrl: string;
};
