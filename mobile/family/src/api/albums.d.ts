export type FamilyAlbum = {
  id: string;
  family_id: string;
  title: string;
  category: string | null;
  cover_emoji: string;
  created_at: string;
  moment_count?: number;
};

export type AlbumMoment = {
  id: string;
  caption: string | null;
  media_url: string;
  taken_at: string;
};

export declare function listAlbums(data: { family_id: string }): Promise<{ albums: FamilyAlbum[] }>;
export declare function createAlbum(data: unknown): Promise<{ album: FamilyAlbum }>;
export declare function getAlbum(data: { album_id: string; family_id: string }): Promise<{
  album: FamilyAlbum;
  moments: AlbumMoment[];
}>;
export declare function updateAlbum(data: {
  id: string;
  family_id: string;
  title: string;
  category?: string;
  cover_emoji?: string;
}): Promise<{ ok: boolean }>;
export declare function deleteAlbum(data: { id: string; family_id: string }): Promise<{ ok: boolean }>;
