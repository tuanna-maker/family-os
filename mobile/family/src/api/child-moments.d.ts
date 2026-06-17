export type ChildMoment = {
  id: string;
  family_id: string;
  child_id: string;
  album_id: string | null;
  title: string;
  caption: string | null;
  media_url: string;
  thumbnail_url: string | null;
  taken_at: string;
  created_at: string;
};

export declare function listChildMoments(data: {
  family_id: string;
  child_id?: string;
  album_id?: string;
  limit?: number;
}): Promise<{ moments: ChildMoment[] }>;

export declare function createChildMoment(data: {
  family_id: string;
  child_id: string;
  album_id: string;
  title?: string;
  caption?: string;
  media_url: string;
  thumbnail_url?: string;
  taken_at?: string;
}): Promise<ChildMoment>;

export declare function deleteChildMoment(data: { id: string }): Promise<{ ok: true }>;
