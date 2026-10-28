import { type Rewind, type RewindYears } from "./rewind.interface";

export async function getRewindYearsForViewer(
	viewerId: string | undefined,
	username: string
): Promise<RewindYears> {
	throw new Error(
		`Rewind years for ${username} seen by ${viewerId ?? "guest"} are not implemented yet`
	);
}

export async function getRewindForViewer(
	viewerId: string | undefined,
	username: string,
	year: number
): Promise<Rewind> {
	throw new Error(
		`Rewind ${year} for ${username} seen by ${viewerId ?? "guest"} is not implemented yet`
	);
}
