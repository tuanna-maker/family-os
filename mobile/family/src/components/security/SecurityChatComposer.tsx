import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Image as ImageIcon, Mic, Send, Smile } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { uploadSecurityChatMedia } from "@mobile/lib/upload-chat-media";
import { useAuth } from "@mobile/hooks/useAuth";
import { toast } from "@mobile/utils/toast";
import type { SendSecurityChatPayload } from "@mobile/lib/security-chat";
import { EmojiPickerPanel } from "@mobile/components/security/EmojiPickerPanel";

type Props = {
  placeholder: string;
  sending: boolean;
  onSend: (payload: SendSecurityChatPayload) => Promise<void>;
};

export function SecurityChatComposer({ placeholder, sending, onSend }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: {
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.card,
      paddingTop: 8,
    },
    inputRow: {
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: 4,
      paddingHorizontal: 8,
    },
    toolBtn: {
      width: 40,
      height: 44,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    recordingBtn: {
      backgroundColor: "#EF4444",
      borderRadius: 20,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 100,
      backgroundColor: c.background,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.foreground,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    send: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.brandDeep,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));

  const { session } = useAuth();
  const userId = session?.user?.id;
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const pickImage = useCallback(async () => {
    if (!userId || busy || sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Cần quyền truy cập thư viện ảnh");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const ext = (asset.mimeType?.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const url = await uploadSecurityChatMedia(asset.uri, {
        userId,
        mimeType: asset.mimeType ?? "image/jpeg",
        ext,
      });
      await onSend({
        message_type: "image",
        media_url: url,
        body: text.trim() || undefined,
      });
      setText("");
      setEmojiOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không gửi được ảnh");
    } finally {
      setBusy(false);
    }
  }, [userId, busy, sending, text, onSend]);

  const toggleRecord = useCallback(async () => {
    if (!userId || busy || sending) return;
    if (recorderState.isRecording) {
      setBusy(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) throw new Error("Không có file ghi âm");
        const durationMs = Math.round((recorderState.durationMillis ?? 0) || 1000);
        const url = await uploadSecurityChatMedia(uri, {
          userId,
          mimeType: "audio/m4a",
          ext: "m4a",
        });
        await onSend({
          message_type: "audio",
          media_url: url,
          media_duration_ms: durationMs,
          body: text.trim() || undefined,
        });
        setText("");
        setEmojiOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không gửi được ghi âm");
      } finally {
        setBusy(false);
      }
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      toast.error("Cần quyền microphone để ghi âm");
      return;
    }
    setEmojiOpen(false);
    Keyboard.dismiss();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [userId, busy, sending, recorder, recorderState, text, onSend]);

  const sendText = useCallback(async () => {
    const body = text.trim();
    if (!body || sending || busy) return;
    await onSend({ body, message_type: "text" });
    setText("");
    setEmojiOpen(false);
  }, [text, sending, busy, onSend]);

  const disabled = sending || busy;
  const recording = recorderState.isRecording;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={styles.inputRow}>
        <Pressable
          style={styles.toolBtn}
          onPress={() => {
            Keyboard.dismiss();
            setEmojiOpen((v) => !v);
          }}
          disabled={disabled}
        >
          <Smile color={emojiOpen ? colors.brandDeep : colors.muted} size={22} />
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => void pickImage()} disabled={disabled}>
          <ImageIcon color={colors.muted} size={22} />
        </Pressable>
        <Pressable
          style={[styles.toolBtn, recording && styles.recordingBtn]}
          onPress={() => void toggleRecord()}
          disabled={disabled && !recording}
        >
          <Mic color={recording ? "#fff" : colors.muted} size={22} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={recording ? "Đang ghi âm… Nhấn mic để gửi" : placeholder}
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          editable={!recording}
          onFocus={() => setEmojiOpen(false)}
        />
        <Pressable
          style={[styles.send, (!text.trim() || disabled) && { opacity: 0.5 }]}
          onPress={() => void sendText()}
          disabled={!text.trim() || disabled}
        >
          {disabled ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send color="#fff" size={20} />
          )}
        </Pressable>
      </View>

      {emojiOpen ? (
        <EmojiPickerPanel
          colors={colors}
          onPick={(emo) => setText((t) => t + emo)}
          onClose={() => setEmojiOpen(false)}
        />
      ) : null}
    </View>
  );
}
