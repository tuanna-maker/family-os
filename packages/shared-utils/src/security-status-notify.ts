export type SecurityNotifyLocale = "vi" | "en";

export type SecurityStatusPhase = "in_progress" | "resolved" | "cancelled";

export type SecurityStatusAudience = "family" | "guard";

type TypeMeta = {
  emoji: string;
  vi: { noun: string; guardNoun: string };
  en: { noun: string; guardNoun: string };
};

const TYPE_META: Record<string, TypeMeta> = {
  sos: {
    emoji: "🆘",
    vi: { noun: "yêu cầu SOS", guardNoun: "SOS khẩn cấp" },
    en: { noun: "SOS request", guardNoun: "emergency SOS" },
  },
  fire: {
    emoji: "🔥",
    vi: { noun: "báo cháy", guardNoun: "báo cháy" },
    en: { noun: "fire alert", guardNoun: "fire alert" },
  },
  intrusion: {
    emoji: "🚨",
    vi: { noun: "báo xâm nhập", guardNoun: "báo xâm nhập" },
    en: { noun: "intrusion alert", guardNoun: "intrusion alert" },
  },
  noise: {
    emoji: "🔊",
    vi: { noun: "phản ánh tiếng ồn", guardNoun: "tiếng ồn" },
    en: { noun: "noise complaint", guardNoun: "noise complaint" },
  },
  package: {
    emoji: "📦",
    vi: { noun: "nhận hàng hộ", guardNoun: "nhận hàng hộ" },
    en: { noun: "package pickup", guardNoun: "package pickup" },
  },
  shipping: {
    emoji: "📮",
    vi: { noun: "gửi hàng đi", guardNoun: "gửi hàng đi" },
    en: { noun: "outbound parcel", guardNoun: "outbound parcel" },
  },
  delivery: {
    emoji: "🛗",
    vi: { noun: "giao tận căn hộ", guardNoun: "giao tận căn" },
    en: { noun: "doorstep delivery", guardNoun: "doorstep delivery" },
  },
  home_care: {
    emoji: "🏠",
    vi: { noun: "chăm sóc tại nhà", guardNoun: "chăm sóc tại nhà" },
    en: { noun: "home care visit", guardNoun: "home care visit" },
  },
  escort: {
    emoji: "🤝",
    vi: { noun: "đưa đón căn hộ", guardNoun: "đưa đón" },
    en: { noun: "escort service", guardNoun: "escort" },
  },
  remote_freight: {
    emoji: "🚚",
    vi: { noun: "chuyển hàng từ xa", guardNoun: "chuyển hàng từ xa" },
    en: { noun: "remote freight", guardNoun: "remote freight" },
  },
  guard_handle: {
    emoji: "🛡️",
    vi: { noun: "bảo vệ xử lý hộ", guardNoun: "xử lý hộ" },
    en: { noun: "guard assistance", guardNoun: "on-site help" },
  },
  hourly_guard: {
    emoji: "⏱️",
    vi: { noun: "bảo vệ theo giờ", guardNoun: "bảo vệ theo giờ" },
    en: { noun: "hourly guard", guardNoun: "hourly guard" },
  },
  custom_guard: {
    emoji: "🛡️",
    vi: { noun: "bảo vệ theo nhu cầu", guardNoun: "bảo vệ theo nhu cầu" },
    en: { noun: "custom guard request", guardNoun: "custom guard request" },
  },
  other: {
    emoji: "📋",
    vi: { noun: "yêu cầu bảo an", guardNoun: "yêu cầu cư dân" },
    en: { noun: "security request", guardNoun: "resident request" },
  },
};

function metaFor(requestType?: string | null) {
  return TYPE_META[requestType ?? ""] ?? TYPE_META.other;
}

function placeSuffix(unitLabel?: string | null) {
  const unit = (unitLabel ?? "").trim();
  return unit ? ` · ${unit}` : "";
}

function capitalizeEn(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Parse trạng thái từ body kiểu "A-1502 · open → in_progress" hoặc title/body thân thiện. */
export function parseSecurityStatusPhase(
  body?: string | null,
  title?: string | null,
): SecurityStatusPhase | null {
  const text = `${body ?? ""} ${title ?? ""}`;
  const arrow = text.match(/→\s*(in_progress|resolved|cancelled)/i);
  if (arrow?.[1]) return arrow[1].toLowerCase() as SecurityStatusPhase;
  if (
    /\bresolved\b/i.test(text) ||
    /xử lý xong|hoàn tất|hoàn thành|all done|completed|is complete/i.test(text)
  ) {
    return "resolved";
  }
  if (
    /\bin_progress\b/i.test(text) ||
    /tiếp nhận|đang xử lý|đã nhận tin|on it|accepted|we're helping|we are helping/i.test(text)
  ) {
    return "in_progress";
  }
  if (/\bcancelled\b/i.test(text) || /đã huỷ|đã hủy|request cancelled|no longer being handled/i.test(text)) {
    return "cancelled";
  }
  return null;
}

export function parseUnitLabelFromBody(body?: string | null): string | undefined {
  if (!body) return undefined;
  if (body.includes("→")) {
    const m = body.match(/^([^·→]+)/);
    const unit = m?.[1]?.trim();
    return unit && unit.length < 40 ? unit : undefined;
  }
  const parts = body.split("·").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].replace(/\.\s*.*$/, "").trim();
    if (
      part &&
      part.length <= 32 &&
      !/^(đang|we're|we are|bạn|thank|cảm ơn)/i.test(part) &&
      !/yên tâm|keep you updated|hoàn tất|complete/i.test(part)
    ) {
      return part;
    }
  }
  return undefined;
}

export function isSecurityStatusNotification(type?: string | null, title?: string | null) {
  if (type === "security.status_changed" || type === "security.request_status") return true;
  const t = (title ?? "").toLowerCase();
  return (
    t.includes("tiếp nhận") ||
    t.includes("xử lý xong") ||
    t.includes("hoàn tất") ||
    t.includes("cập nhật yêu cầu") ||
    t.includes("đã nhận tin") ||
    t.includes("security team on it") ||
    t.includes("all done") ||
    t.includes("accepted") ||
    t.includes("request cancelled")
  );
}

export function securityStatusDedupeKey(requestId: string, status: SecurityStatusPhase) {
  return `security.status:${requestId}:${status}`;
}

export function formatSecurityStatusMessage(input: {
  audience: SecurityStatusAudience;
  status: SecurityStatusPhase;
  locale?: SecurityNotifyLocale;
  requestType?: string | null;
  unitLabel?: string | null;
  requestLabel?: string | null;
}): { title: string; body: string } {
  const locale = input.locale ?? "vi";
  const meta = metaFor(input.requestType);
  const labels = locale === "en" ? meta.en : meta.vi;
  const place = placeSuffix(input.unitLabel);
  const label = (input.requestLabel ?? "").trim();
  const topic = label || labels.noun;

  if (input.audience === "family") {
    if (input.status === "in_progress") {
      if (locale === "en") {
        return {
          title: `${meta.emoji} Security team on it`,
          body: `We're helping with ${topic}${place}. We'll keep you updated!`,
        };
      }
      return {
        title: `${meta.emoji} Đội bảo an đã nhận tin`,
        body: `Đang hỗ trợ ${topic}${place}. Bạn yên tâm, chúng tôi sẽ cập nhật tiếp nhé!`,
      };
    }
    if (input.status === "resolved") {
      if (locale === "en") {
        return {
          title: "✅ All done",
          body: `${capitalizeEn(topic)}${place} is complete. Thank you for trusting our security team!`,
        };
      }
      return {
        title: "✅ Đã xử lý xong",
        body: `${topic.charAt(0).toUpperCase()}${topic.slice(1)}${place} đã hoàn tất. Cảm ơn bạn đã tin tưởng đội bảo an!`,
      };
    }
    if (locale === "en") {
      return {
        title: "Request cancelled",
        body: `${capitalizeEn(topic)}${place} is no longer being handled.`,
      };
    }
    return {
      title: "Yêu cầu đã huỷ",
      body: `${topic}${place} không còn được xử lý.`,
    };
  }

  if (input.status === "in_progress") {
    if (locale === "en") {
      return {
        title: "Accepted",
        body: input.unitLabel?.trim()
          ? `You've taken ${labels.guardNoun} at ${input.unitLabel.trim()}. The resident has been notified.`
          : `You've accepted ${labels.guardNoun}. The resident has been notified.`,
      };
    }
    return {
      title: "Đã tiếp nhận",
      body: input.unitLabel?.trim()
        ? `Bạn đã nhận ${labels.guardNoun} tại ${input.unitLabel.trim()}. Cư dân đã được thông báo.`
        : `Bạn đã tiếp nhận ${labels.guardNoun}. Cư dân đã được thông báo.`,
    };
  }
  if (input.status === "resolved") {
    if (locale === "en") {
      return {
        title: "Completed",
        body: input.unitLabel?.trim()
          ? `${capitalizeEn(labels.guardNoun)} at ${input.unitLabel.trim()} is done. Great job!`
          : `${capitalizeEn(labels.guardNoun)} is complete. The resident has been notified.`,
      };
    }
    return {
      title: "Đã hoàn thành",
      body: input.unitLabel?.trim()
        ? `Đã xử lý xong ${labels.guardNoun} tại ${input.unitLabel.trim()}. Tốt lắm!`
        : `Đã hoàn tất ${labels.guardNoun}. Cư dân đã nhận thông báo.`,
    };
  }
  if (locale === "en") {
    return { title: "Updated", body: "The request status has changed." };
  }
  return { title: "Đã cập nhật", body: "Trạng thái yêu cầu đã thay đổi." };
}

export function formatSecurityStatusPush(input: {
  status: SecurityStatusPhase;
  locale?: SecurityNotifyLocale;
  requestType?: string | null;
  unitLabel?: string | null;
  requestLabel?: string | null;
}) {
  return formatSecurityStatusMessage({ ...input, audience: "family" });
}

export function defaultNotificationTitle(locale: SecurityNotifyLocale = "vi") {
  return locale === "en" ? "Notification" : "Thông báo";
}

export function defaultSecurityNotificationTitle(locale: SecurityNotifyLocale = "vi") {
  return locale === "en" ? "Security update" : "Thông báo bảo an";
}
