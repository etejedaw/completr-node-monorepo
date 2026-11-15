export interface CalendarOpeningOptions {
	isDisabled: () => boolean;
	prepare: () => void;
	closed: () => void;
}
