import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SubHeader } from "@mobile/components/SubHeader";
import {
  getSecurityRequest,
  listSosEvents,
  signSecurityAttachmentUrls,
} from "@guard/api/security";
import { buildPayloadDetailSections } from "@mobile/lib/security-request-payload";
import { formatAge, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";

type AttachmentFile = { path: string; name: string; mime?: string };

function collectAttachments(events: Awaited<ReturnType<typeof listSosEvents>>) {
  const files: AttachmentFile[] = [];
  for (const ev of events) {
    if (ev.event_type !== "attachment") continue;
    const meta = ev.metadata as { attachments?: AttachmentFile[] } | null | undefined;
    for (const f of meta?.attachments ?? []) {
      if (f?.path) files.push(f);
    }
  }
  return files;
}

export default function ResidentRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const { data: request, isLoading, error } = useQuery({
    queryKey: ["guard-request", id],
    queryFn: () => getSecurityRequest(id!),
    enabled: !!id,
  });

  const payload = (request?.payload ?? {}) as Record<string, unknown>;
  const sections = useMemo(
    () =>
      request
        ? buildPayloadDetailSections(request.request_type, payload, {
            building: request.building,
            apartment: request.apartment,
          })
        : [],
    [request, payload],
  );
  const ticketCode = typeof payload.ticket_code === "string" ? payload.ticket_code : null;
  const formTitle =
    (typeof payload.label === "string" && payload.label) ||
    (request ? (REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type) : "");

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["sos-events", id, "detail"],
    queryFn: () => listSosEvents({ id: id! }),
    enabled: !!id && !!request,
  });

  const attachmentFiles = useMemo(() => collectAttachments(events), [events]);

  const { data: signed = [], isLoading: signing } = useQuery({
    queryKey: ["security-attachments", id, attachmentFiles.map((f) => f.path).join(",")],
    queryFn: () => signSecurityAttachmentUrls(attachmentFiles.map((f) => f.path)),
    enabled: attachmentFiles.length > 0,
  });

  const urlByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of signed) {
      if (row.path && row.url) map.set(row.path, row.url);
    }
    return map;
  }, [signed]);

  if (isLoading || !id) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error || !request) {
    return (
      <View className="flex-1 bg-background">
        <SubHeader title="Chi tiết yêu cầu" />
        <Text className="text-center text-muted-foreground mt-10 px-6">
          {error instanceof Error ? error.message : "Không tải được yêu cầu"}
        </Text>
      </View>
    );
  }

  const typeLabel = REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type;
  const statusLabel = REQUEST_STATUS_LABEL[request.status] ?? request.status;

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="CHI TIẾT YÊU CẦU" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>{formTitle}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
            {typeLabel} · {statusLabel} · {formatAge(request.created_at)}
          </Text>
          {ticketCode ? (
            <Text style={{ fontSize: 12, fontFamily: "monospace", color: colors.brand, marginTop: 8 }}>
              {ticketCode}
            </Text>
          ) : null}
        </View>

        {sections.map((section) => (
          <Section key={section.title} title={section.title} colors={colors} isDark={isDark}>
            {section.rows.map((row, index) => (
              <DetailRow
                key={row.key}
                label={row.label}
                value={row.value}
                colors={colors}
                first={index === 0}
              />
            ))}
          </Section>
        ))}

        {eventsLoading || signing ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
        ) : attachmentFiles.length > 0 ? (
          <Section title={`Ảnh / chứng cứ (${attachmentFiles.length})`} colors={colors} isDark={isDark}>
            {attachmentFiles.map((file) => {
              const url = urlByPath.get(file.path);
              const isImage =
                (file.mime ?? "").startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
              return (
                <Pressable
                  key={file.path}
                  onPress={() => {
                    if (url && isImage) setPreviewUri(url);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.cardBorder,
                  }}
                >
                  {url && isImage ? (
                    <Image source={{ uri: url }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                  ) : null}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: url && isImage ? colors.brand : colors.foreground,
                    }}
                  >
                    {file.name}
                  </Text>
                </Pressable>
              );
            })}
          </Section>
        ) : null}
      </ScrollView>

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
  isDark,
}: {
  title: string;
  children: ReactNode;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: isDark ? colors.card : "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  first,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>["colors"];
  first?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: first ? 8 : 12,
        paddingTop: first ? 0 : 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.cardBorder,
      }}
    >
      <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.foreground, lineHeight: 22 }}>{value}</Text>
    </View>
  );
}
