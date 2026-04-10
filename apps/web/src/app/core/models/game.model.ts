export interface Game {
  id: string;
  title: string;
  code: string;
  description?: string;
  releaseAt?: string;
  coverUrl?: string;
  isDlc: boolean;
  parentGameId?: string;
  platforms: Platform[];
  genres: Genre[];
  scores: GameScore[];
  times: GameTime[];
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
