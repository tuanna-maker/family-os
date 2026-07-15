export type Moment = {
  id: string;
  caption: string | null;
  media_url: string;
  thumbnail_url?: string | null;
  taken_at: string;
  album_id?: string | null;
};

export declare function listMoments(data: {
  family_id: string;
  lite?: boolean;
}): Promise<{ moments: Moment[] }>;
export declare function getMoment(data: { moment_id: string; family_id: string }): Promise<{ moment: Moment; reactions: unknown[]; comments: unknown[] }>;
export declare function createMoment(data: unknown): Promise<unknown>;
export declare function deleteMoment(data: { id: string }): Promise<{ ok: boolean }>;
export declare function addMomentComment(data: unknown): Promise<unknown>;
export declare function toggleReaction(data: {
  moment_id: string;
  family_id: string;
  emoji: string;
}): Promise<{ added: boolean }>;
