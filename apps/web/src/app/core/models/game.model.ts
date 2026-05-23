export interface Game {
	id: string;
	title: string;
	code: string;
	description?: string;
	releaseAt?: string;
	backgroundUrl?: string;
	ratio?: number;
	isDlc: boolean;
	justImported?: boolean;
	parentGameId?: string;
	variant?: string | null;
	isCompilation?: boolean;
	isActive?: boolean;
	platforms: Platform[];
	genres: Genre[];
	scores: GameScore[];
	times: GameTime[];
	dlcs: GameSummary[];
	parentGame: GameSummary | null;
	externalLinks: ExternalLink[];
	compilationItems?: CompilationItem[];
	partOfCompilations?: PartOfCompilation[];
}

export interface CompilationItem {
	id: string;
	position: number;
	game: GameSummary | null;
}

export interface PartOfCompilation {
	id: string;
	parentGame: GameSummary;
}

export interface ExternalLink {
	source: string;
	externalId: string;
}

export interface GameSummary {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
}

export interface Platform {
	id: string;
	name: string;
	code: string;
	abbreviation: string;
}

export interface Genre {
	id: string;
	name: string;
	code: string;
}

export interface GameScore {
	source: string;
	score: number;
}

export interface GameTime {
	source: string;
	duration: number;
}
