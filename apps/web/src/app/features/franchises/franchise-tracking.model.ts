export interface TrackableFranchise {
	code: string;
	name: string;
	isTracked: boolean;
}

export interface FranchiseTrackingOptions {
	onMissing?: () => void;
}
