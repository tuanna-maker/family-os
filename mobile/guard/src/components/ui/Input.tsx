import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '@mobile/theme/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    const { colors } = useTheme();
    return (
      <View className="flex flex-col gap-1 w-full">
        {label && (
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`flex h-12 w-full rounded-xl bg-muted/80 px-4 text-sm font-medium text-foreground focus:border focus:border-brand ${
            error ? 'border border-emergency/50' : 'border border-border'
          } ${className || ""}`}
          placeholderTextColor={colors.muted}
          {...props}
        />
        {error && <Text className="mt-1 block text-xs text-emergency font-medium">{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
