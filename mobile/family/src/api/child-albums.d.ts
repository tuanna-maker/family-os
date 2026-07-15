export type ChildAlbum = {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  moment_count?: number;
};

export declare function listChildAlbums(data: {
  family_id: string;
  child_id: string;
}): Promise<{ albums: ChildAlbum[] }>;

export declare function createChildAlbum(data: {
  family_id: string;
  child_id: string;
  title: string;
}): Promise<{ album: ChildAlbum }>;

export declare function getChildAlbum(data: {
  album_id: string;
  family_id: string;
}): Promise<{ album: ChildAlbum; moments: unknown[] }>;

export declare function updateChildAlbum(data: {
  id: string;
  family_id: string;
  title: string;
  cover_url?: string | null;
}): Promise<{ ok: true }>;

export declare function deleteChildAlbum(data: {
  id: string;
  family_id: string;
}): Promise<{ ok: true }>;
