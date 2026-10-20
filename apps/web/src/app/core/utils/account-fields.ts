export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 15;
export const USERNAME_PATTERN = /^[a-z0-9._]+$/;
export const USERNAME_LENGTH_MESSAGE = `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`;
export const USERNAME_PATTERN_MESSAGE =
	"Username must contain only lowercase letters, digits, dots or underscores.";

export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 80;
export const NAME_LENGTH_MESSAGE = `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`;
export const NAME_SAFE_TEXT_MESSAGE =
	"Name must not contain < or > characters.";
