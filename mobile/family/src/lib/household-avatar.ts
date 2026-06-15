export function resolveHouseholdAvatarUrl(opts: {
  profile?: { avatar_url?: string | null } | null;
  family?: { avatar_url?: string | null } | null;
  memberAvatar?: string | null;
  isOwner?: boolean;
}): string | null {
  const { profile, family, memberAvatar, isOwner } = opts;
  const profileUrl = profile?.avatar_url?.trim() || null;
  const familyUrl = family?.avatar_url?.trim() || null;
  const memberUrl = memberAvatar?.trim() || null;

  if (isOwner) {
    return familyUrl ?? profileUrl ?? memberUrl;
  }
  return familyUrl ?? memberUrl ?? profileUrl;
}
