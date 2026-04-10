export interface FavoriteEntry {
  id: string;
  position: number;
  game: {
    id: string;
    title: string;
    coverUrl?: string;
    isDlc: boolean;
  };
}
