import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Auth Service" };

export function userAlreadyExistsError() {
	return new ServiceError("AUTH_USER_ALREADY_EXISTS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidCredentialsError() {
	return new ServiceError("AUTH_INVALID_CREDENTIALS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidTokenError() {
	return new ServiceError("AUTH_INVALID_TOKEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidCurrentPasswordError() {
	return new ServiceError("AUTH_INVALID_CURRENT_PASSWORD", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidRefreshTokenError() {
	return new ServiceError("AUTH_INVALID_REFRESH_TOKEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidPasswordResetTokenError() {
	return new ServiceError("AUTH_INVALID_PASSWORD_RESET_TOKEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
