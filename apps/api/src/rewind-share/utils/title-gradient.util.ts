function hueFromText(text: string): number {
	let hash = 0;
	for (let index = 0; index < text.length; index++) {
		hash = (hash * 31 + text.charCodeAt(index)) | 0;
	}
	return Math.abs(hash) % 360;
}

export function titleGradient(title: string): string {
	const hue = hueFromText(title);
	return `linear-gradient(160deg, hsl(${hue}, 55%, 34%) 0%, hsl(${(hue + 40) % 360}, 60%, 16%) 70%, hsl(${(hue + 60) % 360}, 50%, 9%) 100%)`;
}
