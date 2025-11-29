import { Request } from "express";
import { User } from "../../users";

export interface CustomRequest extends Request {
	user: CustomUser;
	correlationId: string;
}

type CustomUser = Pick<User, "id" | "username" | "email" | "role" | "isActive">;
