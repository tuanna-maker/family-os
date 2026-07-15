import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pause, Play } from "lucide-react-native";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";

const BAR_COUNT = 36;

function formatDuration(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function barHeights(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 16807 + i * 13) % 2147483647;
    return 6 + (h % 14);
  });
}

type Props = {
  uri: string;
  durationMs?: number | null;
  mine: boolean;
};

export function ChatAudioBubble({ uri, durationMs, mine }: Props) {
  const { colors, theme } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const [, setFrame] = useState(0);

  const heights = useMemo(() => barHeights(uri, BAR_COUNT), [uri]);

  const totalSec =
    status.duration > 0 ? status.duration : Math.max(0, (durationMs ?? 0) / 1000);
  const currentSec = Math.max(0, status.currentTime);
  const progress = totalSec > 0 ? Math.min(1, currentSec / totalSec) : 0;
  const playedThrough = progress * BAR_COUNT;

  const atEnd =
    status.didJustFinish || (totalSec > 0 && currentSec >= totalSec - 0.04 && !playing);
  const showCountUp = playing || (progress > 0.01 && !atEnd);
  const totalMs = durationMs ?? Math.round(totalSec * 1000);
  const labelMs = showCountUp ? Math.round(currentSec * 1000) : totalMs;

  const bubbleBg = mine
    ? colors.brandDeep
    : theme === "light"
      ? "#E8A5B5"
      : "#6B4A52";

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* noop */
      }
    };
  }, [player]);

  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const loop = () => {
      setFrame((f) => f + 1);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      /* noop */
    }
  }, [status.didJustFinish, player]);

  const togglePlay = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (atEnd) {
      try {
        player.seekTo(0);
      } catch {
        /* noop */
      }
    }
    player.play();
  };

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        style={[styles.bubble, { backgroundColor: bubbleBg, width: Math.min(268, BAR_COUNT * 4.5 + 88) }]}
        onPress={togglePlay}
      >
        <View style={styles.playWrap}>
          {playing ? (
            <Pause size={16} color="#fff" fill="#fff" />
          ) : (
            <Play size={16} color="#fff" fill="#fff" />
          )}
        </View>
        <View style={styles.waveWrap}>
          {heights.map((h, i) => {
            const fill = Math.min(1, Math.max(0, playedThrough - i));
            const alpha = 0.28 + 0.72 * fill;
            return (
              <View
                key={i}
                style={[styles.bar, { height: h, backgroundColor: `rgba(255,255,255,${alpha})` }]}
              />
            );
          })}
        </View>
        <Text style={styles.duration}>{formatDuration(labelMs)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginBottom: 10,
    flexDirection: "row",
  },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    gap: 8,
    minHeight: 48,
  },
  playWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  waveWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    height: 22,
    overflow: "hidden",
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
    minHeight: 4,
  },
  duration: {
    fontSize: 13,
    fontWeight: "500",
    minWidth: 34,
    textAlign: "right",
    color: "#fff",
  },
});
