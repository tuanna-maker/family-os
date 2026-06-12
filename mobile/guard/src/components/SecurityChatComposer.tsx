import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
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
import { uploadSecurityChatMedia } from "@mobile/lib/upload-chat-media";
import { useAuth } from "@mobile/hooks/useAuth";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useTheme } from "@mobile/theme/themeStore";
import { EmojiPickerPanel } from "@mobile/components/EmojiPickerPanel";

export type GuardChatSendPayload = {
  body?: string;
  message_type?: "text" | "image" | "audio" | "emoji";
  media_url?: string | null;
  media_duration_ms?: number | null;
};

type Props = {
  sending: boolean;
  onSend: (payload: GuardChatSendPayload) => Promise<void>;
};

export function SecurityChatComposer({ sending, onSend }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const pickImage = useCallback(async () => {
    if (!userId || busy || sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppAlert({ title: "Cần quyền", message: "Cho phép truy cập thư viện ảnh để gửi hình." });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
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
      await onSend({ message_type: "image", media_url: url, body: text.trim() || undefined });
      setText("");
      setEmojiOpen(false);
    } catch (e) {
      showAppAlert({
        title: "Lỗi",
        message: e instanceof Error ? e.message : "Không gửi được ảnh",
      });
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
        showAppAlert({
          title: "Lỗi",
          message: e instanceof Error ? e.message : "Không gửi được ghi âm",
        });
      } finally {
        setBusy(false);
      }
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      showAppAlert({ title: "Cần quyền", message: "Cho phép microphone để ghi âm tin nhắn." });
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
    <View
      className="border-t border-border bg-card pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
    >
      <View className="flex-row items-end gap-1 px-2">
        <Pressable
          className="w-10 h-11 items-center justify-center"
          onPress={() => {
            Keyboard.dismiss();
            setEmojiOpen((v) => !v);
          }}
        >
          <Smile color={emojiOpen ? colors.brand : colors.muted} size={22} />
        </Pressable>
        <Pressable
          className="w-10 h-11 items-center justify-center"
          onPress={() => void pickImage()}
          disabled={disabled}
        >
          <ImageIcon color={colors.muted} size={22} />
        </Pressable>
        <Pressable
          className={`w-10 h-11 items-center justify-center rounded-full ${recording ? "bg-red-500" : ""}`}
          onPress={() => void toggleRecord()}
          disabled={disabled && !recording}
        >
          <Mic color={recording ? "white" : colors.muted} size={22} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={recording ? "Đang ghi âm… Nhấn mic để gửi" : "Nhập tin nhắn..."}
          placeholderTextColor={colors.muted}
          className="flex-1 min-h-[44px] max-h-[100px] rounded-2xl px-4 py-2.5 bg-background text-foreground text-base border border-border"
          multiline
          editable={!recording}
          onFocus={() => setEmojiOpen(false)}
        />
        <Pressable
          onPress={() => void sendText()}
          disabled={!text.trim() || disabled}
          className="h-11 w-11 rounded-full bg-brand items-center justify-center"
          style={{ opacity: !text.trim() || disabled ? 0.5 : 1 }}
        >
          {disabled ? <ActivityIndicator color="white" size="small" /> : <Send size={20} color="white" />}
        </Pressable>
      </View>

      {emojiOpen ? (
        <EmojiPickerPanel onPick={(emo) => setText((t) => t + emo)} onClose={() => setEmojiOpen(false)} />
      ) : null}
    </View>
  );
}
