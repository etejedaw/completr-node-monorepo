export interface GameShelfEntry {
  id: string;
  gameId: string;
  platformId: string;
  isPublic: boolean;
  acquiredAt?: string;
  edition?: string;
  notes?: string;
  game: {
    id: string;
    title: string;
    coverUrl?: string;
    isDlc: boolean;
  };
  platform: {
    id: string;
    abbreviation: string;
  };
}
