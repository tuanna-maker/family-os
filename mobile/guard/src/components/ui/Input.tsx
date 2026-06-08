import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '@mobile/theme/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightAccessory?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, label, error, rightAccessory, ...props }, ref) => {
    const { colors } = useTheme();
    return (
      <View className="flex flex-col gap-1 w-full">
        {label && (
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </Text>
        )}
        <View className="relative w-full">
          <TextInput
            ref={ref}
            className={`flex h-12 w-full rounded-xl bg-muted/80 px-4 text-sm font-medium text-foreground focus:border focus:border-brand ${
              error ? 'border border-emergency/50' : 'border border-border'
            } ${rightAccessory ? 'pr-12' : ''} ${className || ""}`}
            placeholderTextColor={colors.muted}
            {...props}
          />
          {rightAccessory ? (
            <View className="absolute right-0 top-0 bottom-0 justify-center pr-3">
              {rightAccessory}
            </View>
          ) : null}
        </View>
        {error && <Text className="mt-1 block text-xs text-emergency font-medium">{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
