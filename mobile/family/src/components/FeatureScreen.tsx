import type { ReactNode } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useI18n } from "@mobile/i18n/useI18n";

export function FeatureScreen({
  title,
  eyebrow,
  back = "/(tabs)/gia-dinh",
  queryKey,
  queryFn,
  render,
  empty,
}: {
  title: string;
  eyebrow?: string;
  back?: string;
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  render: (data: unknown) => ReactNode;
  empty?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    err: { color: c.emergency },
    muted: { color: c.muted, lineHeight: 20 },
  }));
  const { s } = useI18n();
  const q = useQuery({ queryKey, queryFn });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={eyebrow} title={title} back={back} />
      {q.isLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : q.isError ? (
        <Card>
          <Text style={styles.err}>{s.common.loadDataError}</Text>
        </Card>
      ) : q.data ? (
        render(q.data)
      ) : (
        <Card>
          <Text style={styles.muted}>{empty ?? `${s.common.noData}.`}</Text>
        </Card>
      )}
    </Screen>
  );
}

export function StubFeature({ title, note }: { title: string; note?: string }) {
  const { familyId, isLoading } = useFamilyContext();
  const { s } = useI18n();
  const styles = useThemedStyles((c) => ({
    muted: { color: c.muted, lineHeight: 20 },
    stub: { gap: 10 },
    stubTitle: { fontSize: 18, fontWeight: "800" as const, color: c.foreground },
    meta: { fontSize: 11, color: c.muted },
  }));
  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back="/(tabs)/gia-dinh" />
      <Card style={styles.stub}>
        <Text style={styles.stubTitle}>{title}</Text>
        <Text style={styles.muted}>{note ?? s.common.stubNote}</Text>
        {!isLoading && familyId ? (
          <Text style={styles.meta}>family_id: {familyId.slice(0, 8)}…</Text>
        ) : null}
      </Card>
    </Screen>
  );
}

