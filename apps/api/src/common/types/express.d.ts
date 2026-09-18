declare namespace Express {
	interface Request {
		locals: Record<string, unknown>;
	}
}
