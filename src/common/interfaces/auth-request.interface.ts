import { Request } from "express";

export interface AuthRequest extends Request {
	user: {
		id: string;
		usename: string;
		email: string;
		isPublic: string;
		isPremium: string;
	};
}
