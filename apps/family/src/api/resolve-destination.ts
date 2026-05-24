// Pure helper để quyết định trang đích sau khi đăng nhập.
// Tách khỏi component để dễ test và đảm bảo invariant:
// tài khoản gia đình (family_owner / family_member) LUÔN vào /home,
// bỏ qua mọi ?redirect= từ URL.

export type MyContextLike = {
  roles?: string[] | null;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isSecurity?: boolean;
};

export type ResolveDestinationInput = {
  ctx: MyContextLike | null; // null = getMyContext lỗi
  requestedRedirect?: string | null;
  entrySource?: string | null; // "landing" thì luôn ignore redirect
};

export function resolveDestinationPure({
  ctx,
  requestedRedirect,
  entrySource,
}: ResolveDestinationInput): string {
  // Lỗi context -> fallback an toàn là /home
  if (!ctx) return "/home";

  const roles = ctx.roles ?? [];
  const isFamily =
    roles.includes("family_owner") || roles.includes("family_member");

  // Tài khoản gia đình LUÔN /home (trừ khi đồng thời là admin/security)
  if (isFamily && !ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isSecurity) {
    return "/home";
  }

  if (requestedRedirect && entrySource !== "landing") return requestedRedirect;
  if (ctx.isSuperAdmin) return "/admin/super";
  if (ctx.isSecurity) return "/guard";
  if (ctx.isAdmin) return "/admin";
  return "/home";
}
