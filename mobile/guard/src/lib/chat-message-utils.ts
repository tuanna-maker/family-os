import type { SecurityChatMessage } from "@guard/api/security-chat";

const LEGACY_AUTO_REPLY =
  /Bảo an đã nhận tin\. Đội trực sẽ phản hồi|Security received your message\. The on-duty team/i;

/** Tin auto-reply cũ — ẩn khỏi UI bảo vệ. */
export function isLegacyAutoReply(m: Pick<SecurityChatMessage, "sender_role" | "body">) {
  return m.sender_role === "guard" && LEGACY_AUTO_REPLY.test(m.body ?? "");
}

export function filterChatMessages(messages: SecurityChatMessage[]) {
  return messages.filter((m) => !isLegacyAutoReply(m));
}

export function chatMessagePreview(m: Pick<SecurityChatMessage, "body" | "message_type">) {
  const type = m.message_type ?? "text";
  const body = (m.body ?? "").trim();
  if (type === "image") return body && body !== "Ảnh" ? body : "Đã gửi ảnh";
  if (type === "audio") return body && body !== "Ghi âm" ? body : "Đã gửi ghi âm";
  return body || "Tin nhắn mới";
}
