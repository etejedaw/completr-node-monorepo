export function untilAborted<T>(
	promise: Promise<T>,
	signal: AbortSignal | undefined
): Promise<T> {
	if (!signal) return promise;

	return new Promise((resolve, reject) => {
		const rejectOnAbort = () => reject(abortReason(signal));
		if (signal.aborted) rejectOnAbort();
		else signal.addEventListener("abort", rejectOnAbort, { once: true });

		promise.then(
			value => {
				signal.removeEventListener("abort", rejectOnAbort);
				resolve(value);
			},
			(error: unknown) => {
				signal.removeEventListener("abort", rejectOnAbort);
				reject(error);
			}
		);
	});
}

function abortReason(signal: AbortSignal) {
	return signal.reason instanceof Error
		? signal.reason
		: new Error("Operation aborted");
}
