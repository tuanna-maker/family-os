export declare function uploadAvatarFromUri(uri: string, pathPrefix: string): Promise<string>;
export declare function updateProfileAvatar(data: { avatar_url: string }): Promise<{ ok: true; avatar_url: string }>;
export declare function updateFamilyAvatar(data: {
  family_id: string;
  avatar_url: string;
}): Promise<{ ok: true; avatar_url: string }>;
