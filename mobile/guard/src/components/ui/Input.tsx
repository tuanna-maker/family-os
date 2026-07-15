import React from "react";
import { TextInput, TextInputProps, View, Text, StyleSheet } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightAccessory?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, rightAccessory, style, ...props }, ref) => {
    const { colors } = useTheme();
    return (
      <View style={styles.wrap}>
        {label ? <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text> : null}
        <View style={styles.fieldRow}>
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: error ? colors.emergency : colors.cardBorder,
                color: colors.foreground,
              },
              rightAccessory ? { paddingRight: 44 } : null,
              style,
            ]}
            placeholderTextColor={colors.muted}
            {...props}
          />
          {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
        </View>
        {error ? <Text style={[styles.error, { color: colors.emergency }]}>{error}</Text> : null}
      </View>
    );
  },
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  wrap: { width: "100%", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  fieldRow: { position: "relative", width: "100%" },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  accessory: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingRight: 12,
  },
  error: { marginTop: 4, fontSize: 12, fontWeight: "500" },
});
